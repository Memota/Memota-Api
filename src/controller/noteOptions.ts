import { Context } from "koa"
import { Note } from "../entity/note"
import { getManager, Repository } from "typeorm"

import { validate, ValidationError } from "class-validator"
import { NoteOptions } from "../entity/noteOptions"

export default class NoteOptionsController {
  public static async update(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    const newOptions: NoteOptions = new NoteOptions()
    newOptions.encrypted = ctx.request.body.encrypted
    newOptions.pinned = ctx.request.body.encrypted
    newOptions.hidden = ctx.request.body.encrypted

    // validate the note
    const errors: ValidationError[] = await validate(newOptions, {
      validationError: { target: false },
    })

    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      // try to find note
      const note = await noteRepository.findOne(
        {
          id: ctx.params.id,
        },
        {
          relations: ["options"],
        },
      )
      if (!note) {
        ctx.status = 404
        ctx.body = "Note not found"
      } else if (note.user.id !== ctx.state.user.sub) {
        ctx.status = 401
        ctx.body = "No permission"
      } else {
        // Update note options to database
        note.options = newOptions
        const noteFromDatabase = await noteRepository.save(note)
        ctx.status = 200
        ctx.body = noteFromDatabase.options
      }
    }
  }
}
