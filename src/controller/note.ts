import { Context } from "koa"
import { Note } from "../entity/note"
import { getManager, Repository } from "typeorm"

import { User } from "../entity/user"
import { validate, ValidationError } from "class-validator"
import { SharedNote } from "../entity/sharedNote"

export default class NotesController {
  public static async create(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    const noteToBeSaved: Note = new Note()
    noteToBeSaved.title = ctx.request.body.title
    noteToBeSaved.text = ctx.request.body.text
    noteToBeSaved.color = ctx.request.body.color

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
  public static async index(ctx: Context): Promise<void> {
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

  public static async show(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    // try to find user
    const note = await noteRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["user", "sharedNote"],
      },
    )

    if (!note) {
      ctx.status = 404
      ctx.body = "Note not found"
    } else if (note.user.id !== ctx.state.user.sub) {
      ctx.status = 401
      ctx.body = "No permission"
    } else {
      // return the found note
      ctx.status = 200
      ctx.body = note
    }
  }

  public static async update(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    const noteToBePatched: Note = new Note()
    noteToBePatched.title = ctx.request.body.title
    noteToBePatched.text = ctx.request.body.text
    noteToBePatched.color = ctx.request.body.color

    console.log(ctx.request.body)
    console.log(noteToBePatched.text === undefined)

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
        note.text = noteToBePatched.text === undefined ? note.text : noteToBePatched.text
        note.title = noteToBePatched.title === undefined ? note.title : noteToBePatched.title
        note.color = noteToBePatched.color === undefined ? note.color : noteToBePatched.color
        const noteToBeReturned = await noteRepository.save(note)
        delete noteToBeReturned.user
        ctx.status = 200
        ctx.body = noteToBeReturned
      }
    }
  }

  public static async delete(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    // try to find note
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
      await noteRepository.remove(note)
      ctx.status = 200
      ctx.body = "Note deleted"
    }
  }
  public static async createShared(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)
    const sharedNoteRepository: Repository<SharedNote> = getManager().getRepository(SharedNote)

    const noteToBeShared = new SharedNote()

    const expiresAt = new Date(ctx.request.body.expiresAt)
    if (!isNaN(expiresAt.getTime())) {
      noteToBeShared.expiresAt = expiresAt
    }

    const errors: ValidationError[] = await validate(noteToBeShared, {
      validationError: { target: false },
    })

    if (errors.length > 0) {
      ctx.status = 400
      ctx.body = errors
      console.log(errors)
    } else {
      // try to find note
      const note: Note = await noteRepository.findOne(
        {
          id: ctx.params.id,
        },
        {
          relations: ["user", "sharedNote"],
        },
      )

      if (!note) {
        ctx.status = 404
        ctx.body = "Note not found"
      } else if (ctx.state.user.sub !== note.user.id) {
        ctx.status = 401
        ctx.body = "No permission"
      } else {
        if (note.sharedNote) sharedNoteRepository.remove(note.sharedNote)
        note.sharedNote = await sharedNoteRepository.save(noteToBeShared)
        const sharedNote = (await noteRepository.save(note)).sharedNote
        ctx.status = 201
        ctx.body = sharedNote
      }
    }
  }
  public static async deleteShared(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)
    const sharedNoteRepository: Repository<SharedNote> = getManager().getRepository(SharedNote)

    const note: Note = await noteRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["user", "sharedNote"],
      },
    )

    if (!note || !note.sharedNote) {
      ctx.status = 404
      ctx.body = "Note not found"
    } else if (ctx.state.user.sub !== note.user.id) {
      ctx.status = 401
      ctx.body = "No permission"
    } else {
      // delete shared Note
      await sharedNoteRepository.remove(note.sharedNote)
      ctx.status = 200
      ctx.body = "Shared Note deleted"
    }
  }

  public static async showShared(ctx: Context): Promise<void> {
    const sharedNoteRepository: Repository<SharedNote> = getManager().getRepository(SharedNote)

    const sharedNote: SharedNote = await sharedNoteRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["note"],
      },
    )

    if (!sharedNote) {
      ctx.status = 404
      ctx.body = "Shared Note not found"
    } else if (sharedNote.expiresAt != undefined && sharedNote.expiresAt.getTime() < new Date().getTime()) {
      ctx.status = 404
      ctx.body = "Shared Note expired"
    } else {
      ctx.status = 200
      ctx.body = sharedNote
    }
  }
}
