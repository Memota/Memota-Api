import { Context } from "koa"
import { Note } from "../entity/note"
import { getManager, Repository } from "typeorm"

import { User } from "../entity/user"
import { validate, ValidationError } from "class-validator"

export default class NoteController {
  public static async createNote(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

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
        noteToBeSaved.user = user
        const note = await noteRepository.save(noteToBeSaved)
        delete note.user
        ctx.status = 201
        ctx.body = note
      }
    }
  }
  public static async getNotes(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)
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
      ctx.status = 200
      ctx.body = user.notes
    }
  }

  public static async patchNote(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    const noteToBePatched: Note = new Note()
    noteToBePatched.title = ctx.request.body.title
    noteToBePatched.text = ctx.request.body.text

    // validate the note
    const errors: ValidationError[] = await validate(noteToBePatched, {
      groups: ["patch"],
      validationError: { target: false },
    })

    if (errors.length > 0) {
      // return BAD REQUEST status code and errors array
      ctx.status = 400
      ctx.body = errors
    } else {
      // try to find user
      const note = await noteRepository.findOne(
        {
          id: ctx.params.id,
        },
        {
          relations: ["user"],
        },
      )
      if (!note) {
        ctx.status = 404
        ctx.body = "Note not found"
      } else if (note.user.id !== ctx.state.user.sub) {
        ctx.status = 401
        ctx.body = "No permission"
      } else {
        // add note to the users notes and save
        note.text = noteToBePatched.text || note.text
        note.title = noteToBePatched.title || note.title
        const noteToBeReturned = await noteRepository.save(note)
        delete noteToBeReturned.user
        ctx.status = 200
        ctx.body = noteToBeReturned
      }
    }
  }

  public static async deleteNote(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    // try to find user
    const note = await noteRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["user"],
      },
    )

    if (!note) {
      ctx.status = 404
      ctx.body = "Note not found"
    } else if (note.user.id !== ctx.state.user.sub) {
      ctx.status = 401
      ctx.body = "No permission"
    } else {
      // add note to the users notes and save
      noteRepository.remove(note)
      ctx.status = 200
      ctx.body = "Note deleted"
    }
  }
}
