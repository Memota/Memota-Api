import { Context } from "koa"
import { getManager, Repository } from "typeorm"
import { validate, ValidationError } from "class-validator"
import crypto from "crypto"

import { User } from "../entity/user"
import { EmailVerifyToken } from "../entity/emailVerifyToken"
import { email } from "../email"
import { config } from "../config"

export default class UserController {
  public static async createUser(ctx: Context): Promise<void> {
    // get a user repository to perform operations with user
    const userRepository: Repository<User> = getManager().getRepository(User)
    const tokenRepository: Repository<EmailVerifyToken> = getManager().getRepository(EmailVerifyToken)

    // build up user entity to be saved
    const userToBeSaved: User = new User()
    userToBeSaved.username = ctx.request.body.username
    userToBeSaved.email = ctx.request.body.email
    userToBeSaved.password = ctx.request.body.password

    // validate user entity
    const errors: ValidationError[] = await validate(userToBeSaved, {
      groups: ["register"],
      validationError: { target: false },
    })
    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      // save user
      await userToBeSaved.hashPassword()
      const tokenToBeSaved: EmailVerifyToken = new EmailVerifyToken()
      tokenToBeSaved.token = crypto.randomBytes(6).toString("hex")

      try {
        await email.send({
          template: "register",
          message: {
            to: userToBeSaved.email,
          },
          locals: {
            uname: userToBeSaved.username,
            token: tokenToBeSaved.token,
            vurl: config.verifyUrl,
          },
        })
      } catch (err) {
        console.log(err)
        ctx.throw(500, "Could not send email")
      }

      const user = await userRepository.save(userToBeSaved)
      tokenToBeSaved.user = user
      await tokenRepository.save(tokenToBeSaved)
      // don't return password
      delete user.password
      // return CREATED status code and created user
      ctx.status = 201
      ctx.body = user
    }
  }

  public static async verify(ctx: Context) {
    // get email token repository
    const tokenRepository: Repository<EmailVerifyToken> = getManager().getRepository(EmailVerifyToken)

    // try to find token
    const token: EmailVerifyToken = await tokenRepository.findOne({ token: ctx.params.token }, { relations: ["user"] })

    if (!token) {
      // return BAD REQUEST status code and token does not exist error
      ctx.status = 400
      ctx.body = "The specified token was not found"
    } else {
      // set verified status to true
      token.user.verified = true
      await tokenRepository.save(token)
      // delete token
      await tokenRepository.remove(token)
      // return OK status code
      ctx.status = 200
      ctx.body = "Account verified"
    }
  }
  public static async resend(ctx: Context) {
    const userRepository: Repository<User> = getManager().getRepository(User)
    const tokenRepository: Repository<EmailVerifyToken> = getManager().getRepository(EmailVerifyToken)

    // build up user entity to resend to
    const userResendTo: User = new User()
    userResendTo.email = ctx.request.body.email

    // validate user entity for resending
    const errors: ValidationError[] = await validate(userResendTo, {
      groups: ["resend"],
      validationError: { target: false },
    })

    // try to find user
    const user: User = await userRepository.findOne({ email: userResendTo.email }, { relations: ["verifyToken"] })

    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else if (!user || user.verified) {
      // return BAD REQUEST status code and email not found or user is already verified error
      ctx.status = 400
      ctx.body = "The specified email was not found or the user is already verified"
    } else if (user.verifyToken && user.verifyToken.createdAt.getTime() + 15 * 60 * 1000 > new Date().getTime()) {
      // return TOO MANY REQUESTS status code
      ctx.status = 429
      ctx.body = "You have to wait before you can resend"
    } else {
      // delete current token if it exists
      if (user.verifyToken) {
        await tokenRepository.remove(user.verifyToken)
      }

      // generate new token and save it
      const tokenToBeSaved: EmailVerifyToken = new EmailVerifyToken()
      tokenToBeSaved.token = crypto.randomBytes(6).toString("hex")
      tokenToBeSaved.user = user
      await tokenRepository.save(tokenToBeSaved)

      // send verification mail
      try {
        await email.send({
          template: "register",
          message: {
            to: user.email,
          },
          locals: {
            uname: user.username,
            token: tokenToBeSaved.token,
            vurl: config.verifyUrl,
          },
        })
      } catch (err) {
        console.log(err)
        ctx.throw(500, "Could not send email")
      }
      // return OK status code
      ctx.status = 200
      ctx.body = "Email has been sent"
    }
  }
}
