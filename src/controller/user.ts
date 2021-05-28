import { Context } from "koa"
import { getManager, Repository } from "typeorm"
import { validate, ValidationError } from "class-validator"

import { User } from "../entity/user"

export default class UserController {
  public static async createUser(ctx: Context): Promise<void> {
    // get a user repository to perform operations with user
    const userRepository: Repository<User> = getManager().getRepository(User)

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
      const user = await userRepository.save(userToBeSaved)
      // don't return password
      delete user.password
      // return CREATED status code and created user
      ctx.status = 201
      ctx.body = user
    }
  }
}
