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

      // send verification mail
      try {
        await email.send({
          template: "register",
          message: {
            to: userToBeSaved.email,
          },
          locals: {
            uname: userToBeSaved.username,
            token: tokenToBeSaved.token,
            burl: config.baseUrl,
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
}
