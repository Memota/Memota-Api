import { Context } from "koa"
import { Note } from "../entity/note"
import { getManager, Repository } from "typeorm"

import { User } from "../entity/user"
import { validate, ValidationError } from "class-validator"
import { SharedNote } from "../entity/sharedNote"
import { Image } from "../entity/image"
import FileGenerator from "../utils/pdf"
import { NoteOptions } from "../entity/noteOptions"

export default class NotesController {
  public static async create(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)
    const noteRepository: Repository<Note> = getManager().getRepository(Note)
    const noteOptionsRepository: Repository<NoteOptions> = getManager().getRepository(NoteOptions)

    const noteToBeSaved: Note = new Note()
    noteToBeSaved.title = ctx.request.body.title
    noteToBeSaved.text = ctx.request.body.text
    noteToBeSaved.color = ctx.request.body.color

    // validate the note
    {
      const errors: ValidationError[] = await validate(noteToBeSaved, {
        validationError: { target: false },
      })
      if (errors.length > 0) {
        // return BAD REQUEST status code and errors array
        ctx.status = 400
        ctx.body = errors
        return
      }
    }

    const noteOptions: NoteOptions = new NoteOptions()
    noteOptions.encrypted = ctx.request.body.options?.encrypted
    noteOptions.hidden = ctx.request.body.options?.hidden
    noteOptions.pinned = ctx.request.body.options?.pinned

    // validate the notes options
    {
      const errors: ValidationError[] = await validate(noteOptions, {
        validationError: { target: false },
      })
      if (errors.length > 0) {
        // return BAD REQUEST status code and errors array
        ctx.status = 400
        ctx.body = errors
      }
    }

    // try to find user
    const user: User = await userRepository.findOne(
      {
        id: ctx.state.user.sub,
      },
      {
        relations: ["notes", "notes.options"],
      },
    )
    if (!user) {
      ctx.status = 401
      ctx.body = "User not found"
    } else {
      // add note to the users notes and save
      noteToBeSaved.user = user
      noteToBeSaved.options = noteOptions
      await noteOptionsRepository.save(noteOptions)
      const note = await noteRepository.save(noteToBeSaved)
      delete note.user
      ctx.status = 201
      ctx.body = note
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
        relations: ["notes", "notes.image", "notes.options"],
      },
    )
    if (!user) {
      ctx.status = 401
      ctx.body = "User not found"
    } else {
      // add note to the users notes and save
      ctx.status = 200
      ctx.body = user.notes.map(note => {
        const noteWithoutBuffer = note
        if (noteWithoutBuffer.image) delete noteWithoutBuffer.image.buffer
        return noteWithoutBuffer
      })
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
        relations: ["user", "sharedNote", "image", "options"],
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

      if (note.image) {
        delete note.image.buffer
      }

      ctx.status = 200
      ctx.body = note
    }
  }

  public static async update(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)
    const imageRepository: Repository<Image> = getManager().getRepository(Image)
    const noteOptionsRepository: Repository<NoteOptions> = getManager().getRepository(NoteOptions)

    const noteToBePatched: Note = new Note()
    noteToBePatched.title = ctx.request.body.title
    noteToBePatched.text = ctx.request.body.text
    noteToBePatched.color = ctx.request.body.color

    // validate the note
    {
      const errors: ValidationError[] = await validate(noteToBePatched, {
        groups: ["patch"],
        validationError: { target: false },
      })

      if (errors.length > 0) {
        // return BAD REQUEST status code and errors array
        ctx.status = 400
        ctx.body = errors
        return
      }
    }

    const noteOptions: NoteOptions = new NoteOptions()
    noteOptions.encrypted = ctx.request.body.options?.encrypted
    noteOptions.hidden = ctx.request.body.options?.hidden
    noteOptions.pinned = ctx.request.body.options?.pinned

    // validate the notes options
    {
      const errors: ValidationError[] = await validate(noteOptions, {
        validationError: { target: false },
      })
      if (errors.length > 0) {
        // return BAD REQUEST status code and errors array
        ctx.status = 400
        ctx.body = errors
      }
    }

    // try to find user
    const note = await noteRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["user", "options"],
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

      // update note options
      note.options.encrypted = noteOptions.encrypted
      note.options.hidden = noteOptions.hidden
      note.options.pinned = noteOptions.pinned

      const noteToBeReturned = await noteRepository.save(note)
      noteOptions.id = noteToBeReturned.options.id

      await noteOptionsRepository.save(noteOptions)

      delete noteToBeReturned.user
      ctx.status = 200
      ctx.body = noteToBeReturned
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
        if (note.sharedNote) await sharedNoteRepository.remove(note.sharedNote)
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

  public static async updateImage(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)
    const imageRepository: Repository<Image> = getManager().getRepository(Image)

    const note: Note = await noteRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["user", "image"],
      },
    )

    const image: Image = await imageRepository.findOne(
      {
        id: ctx.request.body.image,
      },
      {
        relations: ["user"],
      },
    )

    if (!note || !image) {
      ctx.status = 404
      ctx.body = "Note or image not found"
    } else if (ctx.state.user.sub !== note.user.id || ctx.state.user.sub !== image.user.id) {
      ctx.status = 401
      ctx.body = "No permission"
    } else {
      note.image = image
      await noteRepository.save(note)
      ctx.status = 201
      ctx.body = "Image added"
    }
  }

  public static async deleteImage(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    const note: Note = await noteRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["user", "image"],
      },
    )

    if (!note) {
      ctx.status = 404
      ctx.body = "Note or image not found"
    } else if (ctx.state.user.sub !== note.user.id) {
      ctx.status = 401
      ctx.body = "No permission"
    } else {
      note.image = null
      await noteRepository.save(note)
      ctx.status = 200
      ctx.body = "Image removed"
    }
  }

  public static async download(ctx: Context): Promise<void> {
    const noteRepository: Repository<Note> = getManager().getRepository(Note)

    // try to find user
    const note = await noteRepository.findOne(
      {
        id: ctx.params.id,
      },
      {
        relations: ["user", "image"],
      },
    )

    if (!note) {
      ctx.status = 404
      ctx.body = "Note not found"
    } else if (note.user.id !== ctx.state.user.sub) {
      ctx.status = 401
      ctx.body = "No permission"
    } else {
      const pdf = FileGenerator.generateNotePdf(note, true, true)
      const fileName = note.title.toLocaleLowerCase().replace(/ /g, "-") + ".pdf"
      ctx.response.set("content-type", "application/pdf")
      ctx.response.set("Content-Disposition", "attachment; filename=" + fileName + ".pdf")
      ctx.status = 200
      ctx.body = pdf
    }
  }

  public static async downloadBackup(ctx: Context): Promise<void> {
    const userRepository: Repository<User> = getManager().getRepository(User)
    // try to find user
    const user: User = await userRepository.findOne(
      {
        id: ctx.state.user.sub,
      },
      {
        relations: ["notes", "notes.image"],
      },
    )
    if (!user) {
      ctx.status = 401
      ctx.body = "User not found"
    } else {
      const images = ctx.request.query.images == "true"
      const colors = ctx.request.query.colors == "true"
      const zip = await FileGenerator.generateBackupZip(user, images, colors)
      const fileName = user.username.toLocaleLowerCase() + "-memota-backup-" + new Date().toLocaleDateString("fr-CA")
      ctx.response.set("content-type", "application/zip")
      ctx.response.set("content-disposition", "attachment; filename=" + fileName + ".zip")
      ctx.status = 200
      ctx.body = zip
    }
  }
}
