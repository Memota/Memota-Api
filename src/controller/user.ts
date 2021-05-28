import { Context } from "koa"

export default class UserController {
  public static async createUser(ctx: Context): Promise<void> {
    ctx.status = 201
    ctx.body = "test"
  }
}
