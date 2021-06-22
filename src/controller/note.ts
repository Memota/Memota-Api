import { Context } from "koa"
import { Note } from "../entity/note"
import { getManager, Repository } from "typeorm"

import { User } from "../entity/user"
import { validate, ValidationError } from "class-validator"

export default class NoteController {
  public static async createNote(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)
    const userRepository: Repository<User> = getManager().getRepository(User)
    const noteToBeSaved: Note = new Note()
    noteToBeSaved.title = ctx.request.body.title
    noteToBeSaved.text = ctx.request.body.text

    // validate the note
    const errors: ValidationError[] = await validate(noteToBeSaved, {
      validationError: { target: false },
    })
    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      // try to find user
      const user: User = await userRepository.findOne(
        {
          id: ctx.state.user.sub,
        },
        {
          relations: ["notes"],
        },
      )
      if (!user) {
        ctx.status = 401
        ctx.body = "User not found"
      } else {
        // add note to the users notes and save
        // user.notes.push(note)
        //  userRepository.save(user)
        noteToBeSaved.user = user
        const note = await noteRepository.save(noteToBeSaved)
        delete note.user
        ctx.status = 200
        ctx.body = note
      }
    }
  }
}
