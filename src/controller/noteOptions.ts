import { Context } from "koa"
import { getManager, Repository } from "typeorm"
import { validate, ValidationError } from "class-validator"

import { Note } from "../entity/note"
import { NoteOptions } from "../entity/noteOptions"

export default class NoteOptionsController {
  public static async update(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    // Fetch note options from body
    const newOptions: NoteOptions = new NoteOptions()
    newOptions.encrypted = ctx.request.body.encrypted
    newOptions.pinned = ctx.request.body.pinned
    newOptions.hidden = ctx.request.body.hidden

    // Validate the note options
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

        // OK
        ctx.status = 200
        ctx.body = noteFromDatabase.options
      }
    }
  }

  public static async show(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    // try to find the note
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
      // Return the notes options
      ctx.status = 200
      ctx.body = note.options
    }
  }
}
