import { Context } from "koa"
import { getManager, Repository } from "typeorm"

import { validate, ValidationError } from "class-validator"
import { Settings } from "../entity/settings"
import { User } from "../entity/user"
import { settings } from "./index"

export default class SettingsController {
  public static async update(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)

    const settingsToBePatched: Settings = new Settings()
    settingsToBePatched.darkMode = ctx.request.body.darkMode

    // validate settings
    const errors: ValidationError[] = await validate(settingsToBePatched, {
      groups: ["patch"],
      validationError: { target: false },
    })

    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      // try to find user
      const user: User = await userRepository.findOne({ id: ctx.state.user.sub }, { relations: ["settings"] })
      if (!user) {
        ctx.status = 404
        ctx.body = "Could not find user settings"
      } else if (user.id !== ctx.state.user.sub) {
        ctx.status = 401
        ctx.body = "No permission"
      } else {
        // update dark mode settings
        user.settings.darkMode = settingsToBePatched.darkMode

        const userToBeReturned = await userRepository.save(user)
        ctx.status = 200
        ctx.body = userToBeReturned.settings
      }
    }
  }
}
