import { Context, DefaultState, ParameterizedContext } from "koa"
import { ValidationError, validate } from "class-validator"
import { getManager, Not, OneToOne, SimpleConsoleLogger } from "typeorm"
import jwt from "jsonwebtoken"

import { User } from "../../src/entity/user"
import { Note } from "../../src/entity/note"
import NoteController from "../../src/controller/note"
import { SharedNote } from "../../src/entity/sharedNote"
import { Image } from "../../src/entity/image"
import fs from "fs"
import { toBuffer } from "../../src/utils/pdf"

let user: User
let userInRepository: User
let note: Note
let image: Image
let testImageArrayBuffer: ArrayBuffer
let sharedNote: SharedNote
let samplePDF: Buffer

jest.mock("typeorm", () => {
  const doNothing = () => {
    //Empty function that mocks typeorm annotations
  }

  return {
    getManager: jest.fn(),
    PrimaryGeneratedColumn: doNothing,
    Column: doNothing,
    Entity: doNothing,
    Equal: doNothing,
    Not: doNothing,
    Like: doNothing,
    OneToOne: doNothing,
    JoinColumn: doNothing,
    CreateDateColumn: doNothing,
    ManyToOne: doNothing,
    OneToMany: doNothing,
    UpdateDateColumn: doNothing,
  }
})

jest.mock("@join-com/typeorm-class-validator-is-uniq", () => {
  const doNothing = () => {
    //Empty function that mocks typeorm annotations
  }
  return {
    IsUniq: doNothing,
  }
})

jest.mock("class-validator", () => {
  const doNothing = () => {
    //Empty function that mocks typeorm annotations
  }

  return {
    validate: jest.fn(),
    Length: doNothing,
    IsEmail: doNothing,
    Matches: doNothing,
    ValidateIf: doNothing,
    IsOptional: doNothing,
    IsHexColor: doNothing,
    IsBoolean: doNothing,
    IsDate: doNothing,
  }
})

interface JwtResponseBody {
  token: string
}

beforeEach(async () => {
  user = new User()
  user.id = "2c7cfd5b-e905-4493-83df-cf7b570db641"
  user.username = "Steve"
  user.email = "steve@example.com"
  user.password = "test123"
  user.verified = false

  sharedNote = new SharedNote()
  sharedNote.id = "0d8aac83-953f-4176-a3b5-187674a5c95f"

  image = new Image()
  image.mimetype = "application/jpeg"
  image.id = "3e8a1e8c-e27c-41f5-b434-8ebea6c33806"
  testImageArrayBuffer = fs.readFileSync("assets/logo.png", null).buffer
  image.buffer = toBuffer(testImageArrayBuffer)

  note = new Note()
  note.title = "My Tasks"
  note.text = "Do the dishes"
  note.user = user
  note.id = "9n2cfd5b-e905-4493-83df-cf7b570db4f0"
  note.color = "#ffffff"
  note.sharedNote = sharedNote
  note.image = image
  user.notes = [note]

  userInRepository = new User()
  userInRepository.email = user.email
  userInRepository.username = user.username
  userInRepository.password = user.password
  userInRepository.verified = true
  await userInRepository.hashPassword()

  samplePDF = toBuffer(fs.readFileSync("assets/samplePDF.pdf", null).buffer)
})

describe("Note controller", () => {
  // Test: create note -> OK
  it("createNote -> Status 201", async () => {
    const userRepository = { findOne: jest.fn().mockReturnValue(user) }
    const noteRepository = { save: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
    } as unknown) as Context

    await NoteController.create(context)

    expect(userRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(201)
    expect(context.body).toStrictEqual(note)
  })
  // Test: create note -> User not found
  it("createNote -> Status 401", async () => {
    const userRepository = { findOne: jest.fn().mockReturnValue(undefined) }
    const noteRepository = { save: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
    } as unknown) as Context

    await NoteController.create(context)

    expect(userRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(401)
    expect(context.body).toEqual("User not found")
  })
  // Test: create note -> Bad request (validation error)
  it("createNote -> Status 400", async () => {
    const userRepository = { findOne: jest.fn().mockReturnValue(user) }
    const noteRepository = { save: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue(["validation error"])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
    } as unknown) as Context

    await NoteController.create(context)

    expect(context.status).toBe(400)
    expect(context.body).toEqual(["validation error"])
  })
  // Test: get note -> find and return note
  it("getNote -> Status 200", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.show(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual(note)
  })
  // Test: get note -> Not found
  it("getNote -> Status 404", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(undefined) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.show(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(404)
    expect(context.body).toEqual("Note not found")
  })
  // Test: get note -> No permission for this note
  it("getNote -> Status 401", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: "abc" } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.show(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(401)
    expect(context.body).toEqual("No permission")
  })
  // Test: get notes -> find and return notes array
  it("getNotes -> Status 200", async () => {
    const userRepository = { findOne: jest.fn().mockReturnValue(user) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
    } as unknown) as Context

    await NoteController.index(context)

    expect(userRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual([note])
  })
  // Test: get notes -> User not found
  it("getNotes -> Status 401", async () => {
    const userRepository = { findOne: jest.fn().mockReturnValue(undefined) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
    } as unknown) as Context

    await NoteController.index(context)

    expect(userRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(401)
    expect(context.body).toStrictEqual("User not found")
  })
  // Test: patch note -> title patched
  it("patchNote title -> Status 200", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), save: jest.fn().mockReturnValue(note) }
    const imageRepository = {}
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const patchNote = new Note()
    patchNote.title = "patched title"

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: patchNote },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.update(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledWith(note)
    expect(context.status).toBe(200)
    expect(context.body).toEqual(note)
    expect((context.body as Note).title).toStrictEqual(patchNote.title)
    expect((context.body as Note).text).toStrictEqual(note.text)
  })
  // Test: patch note -> text patched
  it("patchNote text -> Status 200", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), save: jest.fn().mockReturnValue(note) }
    const imageRepository = {}
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const patchNote = new Note()
    patchNote.text = "patched text"

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: patchNote },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.update(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledWith(note)
    expect(context.status).toBe(200)
    expect(context.body).toEqual(note)
    expect((context.body as Note).title).toStrictEqual(note.title)
    expect((context.body as Note).text).toStrictEqual(patchNote.text)
  })
  // Test: patch note -> text & title patched
  it("patchNote -> Status 200", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), save: jest.fn().mockReturnValue(note) }
    const imageRepository = {}
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const patchNote = new Note()
    patchNote.text = "patched text"
    patchNote.title = "patched title"

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: patchNote },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.update(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledWith(note)
    expect(context.status).toBe(200)
    expect(context.body).toEqual(note)
    expect((context.body as Note).title).toStrictEqual(patchNote.title)
    expect((context.body as Note).text).toStrictEqual(patchNote.text)
  })

  // Test: patch note -> failed to patch invalid note
  it("patchNote -> Status 400", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), save: jest.fn().mockReturnValue(note) }
    const imageRepository = {}
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })
    ;(validate as jest.Mock).mockReturnValue(["validation error"])

    const patchNote = new Note()

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: patchNote },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.update(context)

    expect(noteRepository.save).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(400)
    expect(context.body).toEqual(["validation error"])
  })

  // Test: patch note -> Note not found
  it("patchNote -> Status 404", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(undefined), save: jest.fn().mockReturnValue(note) }
    const imageRepository = {}
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const patchNote = new Note()

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: patchNote },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.update(context)

    expect(noteRepository.save).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(404)
    expect(context.body).toEqual("Note not found")
  })

  // Test: patch note -> No permission for this note
  it("patchNote -> Status 401", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), save: jest.fn().mockReturnValue(note) }
    const imageRepository = {}
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const patchNote = new Note()

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: patchNote },
      state: { user: { sub: "abc" } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.update(context)

    expect(noteRepository.save).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
    expect(context.body).toEqual("No permission")
  })
  // Test: delete note -> Note deleted
  it("deleteNote -> Status 200", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.delete(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.remove).toHaveBeenCalledTimes(1)
    expect(noteRepository.remove).toHaveBeenCalledWith(note)
    expect(context.status).toBe(200)
    expect(context.body).toEqual("Note deleted")
  })
  // Test: delete note -> Note not found
  it("deleteNote -> Status 404", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(undefined), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.delete(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(404)
    expect(context.body).toEqual("Note not found")
  })
  // Test: delete note -> No permission
  it("deleteNote -> Status 414", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: note },
      state: { user: { sub: "abc" } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.delete(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
    expect(context.body).toEqual("No permission")
  })
  it("createSharedNote -> Status 200", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), save: jest.fn().mockReturnValue(note) }
    const sharedNoteRepository = { save: jest.fn(), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => sharedNoteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: {} },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.createShared(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledTimes(1)
    expect(sharedNoteRepository.save).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(201)
  })
  it("createSharedNote -> Status 404", async () => {
    const noteRepository = { findOne: (): undefined => undefined, save: jest.fn().mockReturnValue(note) }
    const sharedNoteRepository = { save: jest.fn(), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => sharedNoteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: {} },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.createShared(context)

    expect(noteRepository.save).toHaveBeenCalledTimes(0)
    expect(sharedNoteRepository.save).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(404)
  })
  it("createSharedNote -> Status 401", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note), save: jest.fn().mockReturnValue(note) }
    const sharedNoteRepository = { save: jest.fn(), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => sharedNoteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: {} },
      state: { user: { sub: "test" } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.createShared(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledTimes(0)
    expect(sharedNoteRepository.save).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
  })
  it("deleteShared -> Status 200", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note) }
    const sharedNoteRepository = { remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => sharedNoteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: {} },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.deleteShared(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(sharedNoteRepository.remove).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
  })
  it("deleteShared -> Status 404", async () => {
    const noteRepository = { findOne: (): undefined => undefined }
    const sharedNoteRepository = { remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => sharedNoteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: {} },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.deleteShared(context)

    expect(sharedNoteRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(404)
  })
  it("deleteShared -> Status 401", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note) }
    const sharedNoteRepository = { remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => sharedNoteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: {} },
      state: { user: { sub: "test" } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteController.deleteShared(context)

    expect(noteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(sharedNoteRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
  })
  it("showShared -> Status 200", async () => {
    const sharedNoteRepository = { findOne: jest.fn().mockReturnValue(sharedNote) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => sharedNoteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      params: { id: sharedNote.id },
    } as unknown) as Context

    await NoteController.showShared(context)

    expect(sharedNoteRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
  })
  it("showShared -> Status 404", async () => {
    const sharedNoteRepository = { findOne: (): undefined => undefined }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => sharedNoteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      params: { id: sharedNote.id },
    } as unknown) as Context

    await NoteController.showShared(context)

    expect(context.status).toBe(404)
  })
  it("download -> Status 200", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      request: { body: {} },
      response: { set: jest.fn() },
      state: { user: { sub: user.id } },
      params: { id: user.id },
    } as unknown) as Context

    await NoteController.download(context)

    expect(context.status).toBe(200)
    // body contains pdf
    expect(context.body.toString().substring(0, 200)).toEqual(samplePDF.toString().substring(0, 200))
    expect(context.body.toString().length).toEqual(samplePDF.toString().length)
  })
  it("download -> Status 404", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(undefined) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      request: { body: {} },
      response: { set: jest.fn() },
      state: { user: { sub: user.id } },
      params: { id: user.id },
    } as unknown) as Context

    await NoteController.download(context)
    expect(context.status).toBe(404)
    expect(context.body).toEqual("Note not found")
  })
  it("download -> Status 401", async () => {
    const noteRepository = { findOne: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      request: { body: {} },
      response: { set: jest.fn() },
      state: { user: { sub: "wrong" } },
      params: { id: user.id },
    } as unknown) as Context

    await NoteController.download(context)
    expect(context.status).toBe(401)
    expect(context.body).toEqual("No permission")
  })
  it("downloadBackup -> Status 401", async () => {
    const userRepository = { findOne: jest.fn().mockReturnValue(undefined) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      request: { body: {} },
      response: { set: jest.fn() },
      state: { user: { sub: "wrong" } },
      params: { id: "wrong" },
    } as unknown) as Context

    await NoteController.downloadBackup(context)

    expect(context.status).toBe(401)
  })
  it("downloadBackup -> Status 200", async () => {
    user.notes = [note]
    const userRepository = { findOne: jest.fn().mockReturnValue(user) }
    const noteRepository = { findOne: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      request: { body: {}, query: { images: true, colors: true } },
      response: { set: jest.fn() },
      state: { user: { sub: user.id } },
      params: { id: user.id },
    } as unknown) as Context

    await NoteController.downloadBackup(context)

    expect(context.status).toBe(200)
    // body contains zip (> 0.5mb [~500000 chars])
    expect(context.body.toString().length).toBeGreaterThan(500000)
  })
})
