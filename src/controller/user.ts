import { validate, ValidationError } from "class-validator"
import { Context } from "koa"
import { getManager, Repository } from "typeorm"

import { User } from "../entity/user"

export default class UserController {
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
  public static async update(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)

    const userToBePatched: User = new User()
    userToBePatched.username = ctx.request.body.username
    userToBePatched.noteColors = ctx.request.body.noteColors as string[]
    console.log(typeof userToBePatched.noteColors)
    console.log(ctx.request.body.noteColors)
    // console.log(ctx.request.body)

    // validate the info
    const errors: ValidationError[] = await validate(userToBePatched, {
      groups: ["patch"],
      validationError: { target: false },
    })

    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      // try to find user
      const user = await userRepository.findOne({
        id: ctx.state.user.sub,
      })
      if (!user || !user.verified) {
        ctx.status = 401
        ctx.body = "Not authorized"
      } else {
        // patch the users information
        user.username = userToBePatched.username === undefined ? user.username : userToBePatched.username
        user.noteColors = userToBePatched.noteColors === undefined ? user.noteColors : userToBePatched.noteColors
        const userToBeReturned = await userRepository.save(user)
        // don't return password
        delete user.password
        ctx.status = 200
        ctx.body = userToBeReturned
      }
    }
  }
}
