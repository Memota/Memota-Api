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
}
