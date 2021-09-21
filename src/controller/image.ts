import mime from "mime-types"

import { Context } from "koa"
import { Note } from "../entity/note"
import { getManager, Repository } from "typeorm"

import { Image } from "../entity/image"
import { validate, ValidationError } from "class-validator"
import { SharedNote } from "../entity/sharedNote"
import { User } from "../entity/user"

export default class ImageController {
  public static async create(ctx: Context) {
    const imageRepository: Repository<Image> = getManager().getRepository(Image)
    const userRepository: Repository<User> = getManager().getRepository(User)

    const imageToBeSaved: Image = new Image()
    imageToBeSaved.buffer = ctx.file.buffer
    imageToBeSaved.mimetype = ctx.file.mimetype

    const user: User = await userRepository.findOne(
      {
        id: ctx.state.user.sub,
      },
      {
        relations: ["images"],
      },
    )

    if (!user) {
      ctx.status = 401
      ctx.body = "User not found"
    } else {
      imageToBeSaved.user = user
      await imageRepository.save(imageToBeSaved)

      ctx.body = "Image uploaded"
      ctx.status = 201
    }
  }
  public static async show(ctx: Context | any) {
    const imageRepository: Repository<Image> = getManager().getRepository(Image)

    const image = await imageRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["user"],
      },
    )

    if (!image) {
      ctx.status = 404
      ctx.body = "Note not found"
    } else if (image.user.id !== ctx.state.user.sub) {
      ctx.status = 401
      ctx.body = "No permission"
    } else {
      ctx.response.set("content-type", image.mimetype)
      ctx.response.set("content-disposition", "attachment; filename=image." + mime.extension(image.mimetype))

      ctx.body = image.buffer
      ctx.status = 200
    }
  }
}