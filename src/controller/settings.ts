import { Context } from "koa"
import { getManager, Repository } from "typeorm"
import { validate, ValidationError } from "class-validator"

import { Settings } from "../entity/settings"
import { User } from "../entity/user"
import { Image } from "../entity/image"

export default class SettingsController {
  public static async update(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)
    const imageRepository: Repository<Image> = getManager().getRepository(Image)

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
      const user: User = await userRepository.findOne(
        { id: ctx.state.user.sub },
        { relations: ["settings", "settings.image"] },
      )

      let image: Image
      if (ctx.request.body.image) {
        image = await imageRepository.findOne({ id: ctx.request.body.image }, { relations: ["user"] })
      }

      if (!user) {
        ctx.status = 404
        ctx.body = "Could not find user settings"
      } else if (ctx.request.body.image && !image) {
        ctx.status = 404
        ctx.body = "Could not find image"
      } else if (image && image.user.id !== ctx.state.user.sub) {
        ctx.status = 401
        ctx.body = "No permission"
      } else if (user.id !== ctx.state.user.sub) {
        ctx.status = 401
        ctx.body = "No permission"
      } else {
        // update dark mode settings
        user.settings.darkMode = settingsToBePatched.darkMode

        if (image) {
          user.settings.image = image
        }

        const userToBeReturned = await userRepository.save(user)
        ctx.status = 200
        ctx.body = userToBeReturned.settings
      }
    }
  }
}
