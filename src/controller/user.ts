import { Context } from "koa"
import { getManager, Repository } from "typeorm"
import { validate, ValidationError } from "class-validator"
import crypto from "crypto"
import jwt from "jsonwebtoken"

import { User } from "../entity/user"
import { EmailVerifyToken } from "../entity/emailVerifyToken"
import { email } from "../email"
import { config } from "../config"
import { PasswordResetToken } from "../entity/passwordResetToken"

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
          template: "verify",
          message: {
            to: userToBeSaved.email,
          },
          locals: {
            uname: userToBeSaved.username,
            token: tokenToBeSaved.token,
            vurl: config.baseUrl + "users/verify/",
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
          template: "verify",
          message: {
            to: user.email,
          },
          locals: {
            uname: user.username,
            token: tokenToBeSaved.token,
            vurl: config.baseUrl + "users/verify/",
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

  public static async loginUser(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)

    // build up user entity to use for login
    const userToBeLoggedIn: User = new User()
    userToBeLoggedIn.username = ctx.request.body.username
    userToBeLoggedIn.email = ctx.request.body.email
    userToBeLoggedIn.password = ctx.request.body.password

    // validate user entity
    const errors: ValidationError[] = await validate(userToBeLoggedIn, {
      groups: ["login"],
      validationError: { target: false },
    })
    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      // try to find existing user with same email and username
      const user: User = await userRepository.findOne({
        where: [{ email: userToBeLoggedIn.email }, { username: userToBeLoggedIn.username }],
      })
      // compare passwords
      if (!user || !(await user.compareHash(userToBeLoggedIn.password))) {
        ctx.status = 400
        ctx.body = "Username/Email was not found or password is invalid"
      } else if (!user.verified) {
        ctx.status = 401
        ctx.body = "Specified User has not been verified yet"
      } else {
        // create new jwt for authentication that expires in 1 month
        const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: "30d" })
        ctx.status = 200
        ctx.body = { token: token }
      }
    }
  }

  public static async getProfile(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)
    // try to find user
    const user: User = await userRepository.findOne({
      id: ctx.state.user.sub,
    })
    if (!user) {
      ctx.status = 401
      ctx.body = "User not found"
    } else {
      // return user and delete password for safety
      delete user.password
      ctx.status = 200
      ctx.body = user
    }
  }

  public static async sendPasswordReset(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)
    const tokenRepository: Repository<PasswordResetToken> = getManager().getRepository(PasswordResetToken)

    // build up user entity to send password reset email
    const userToResetPasswordFor: User = new User()
    userToResetPasswordFor.email = ctx.request.body.email

    // validate user entity for sending the password reset request
    const errors: ValidationError[] = await validate(userToResetPasswordFor, {
      groups: ["send-reset"],
      validationError: { target: false },
    })
    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      const user: User = await userRepository.findOne(
        { email: userToResetPasswordFor.email },
        { relations: ["resetToken"] },
      )
      if (!user) {
        ctx.status = 401
        ctx.body = "User not found"
      } else if (!user.verified) {
        ctx.status = 401
        ctx.body = "Specified User has not been verified yet"
      } else if (user.resetToken && user.resetToken.createdAt.getTime() + 60 * 1000 > new Date().getTime()) {
        // return TOO MANY REQUESTS status code
        ctx.status = 429
        ctx.body = "You have to wait before you can request another password reset"
      } else {
        if (user.resetToken) {
          await tokenRepository.remove(user.resetToken)
        }
        // generate new token to reset the password with
        const tokenToBeSaved: PasswordResetToken = new PasswordResetToken()
        tokenToBeSaved.token = crypto.randomBytes(6).toString("hex")
        tokenToBeSaved.user = user
        await tokenRepository.save(tokenToBeSaved)

        try {
          await email.send({
            template: "reset",
            message: {
              to: user.email,
            },
            locals: {
              uname: user.username,
              token: tokenToBeSaved.token,
              rurl: config.baseUrl + "users/reset/",
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

  public static async resetPassword(ctx: Context): Promise<void> {
    const tokenRepository: Repository<PasswordResetToken> = getManager().getRepository(PasswordResetToken)

    // create user object with provided password
    const userToResetPasswordFor: User = new User()
    userToResetPasswordFor.password = ctx.request.body.password

    const errors: ValidationError[] = await validate(userToResetPasswordFor, {
      groups: ["password-reset"],
      validationError: { target: false },
    })
    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      // try to find token
      const token: PasswordResetToken = await tokenRepository.findOne(
        { token: ctx.request.body.token },
        { relations: ["user"] },
      )
      if (!token) {
        ctx.status = 400
        ctx.body = "The specified token was not found"
      } else if (token.createdAt.getTime() + 2 * 60 * 60 * 1000 < new Date().getTime()) {
        ctx.status = 401
        ctx.body = "This password reset token has expired"
      } else {
        // set new user password
        await userToResetPasswordFor.hashPassword()
        token.user.password = userToResetPasswordFor.password
        // save user
        await tokenRepository.save(token)
        // delete token
        await tokenRepository.remove(token)
        // return OK status code
        ctx.status = 200
        ctx.body = "Password has been reset"
      }
    }
  }
}
