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
import { NoteOptions } from "../../src/entity/noteOptions"
import NoteOptionsController from "../../src/controller/noteOptions"

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
  note.options = new NoteOptions()
  note.options.encrypted = false
  user.notes = [note]
  sharedNote.note = note

  userInRepository = new User()
  userInRepository.email = user.email
  userInRepository.username = user.username
  userInRepository.password = user.password
  userInRepository.verified = true
  await userInRepository.hashPassword()

  samplePDF = toBuffer(fs.readFileSync("assets/samplePDF.pdf", null).buffer)
})

describe("Note options controller", () => {
  // Test: Update note options -> OK
  it("updateNoteOptions -> Status 200", async () => {
    const noteRepository = { save: jest.fn().mockReturnValue(note), findOne: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const newOptions = new NoteOptions()
    newOptions.encrypted = true

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: newOptions },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteOptionsController.update(context)

    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual(note.options)
  })
  // Test: Update note options -> Note not found
  it("updateNoteOptions -> Status 404", async () => {
    const noteRepository = { save: jest.fn().mockReturnValue(note), findOne: jest.fn().mockReturnValue(undefined) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const newOptions = new NoteOptions()
    newOptions.encrypted = true

    const context = ({
      status: undefined,
      body: newOptions,
      request: { body: newOptions },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteOptionsController.update(context)

    expect(context.status).toBe(404)
  })
  // Test: Update note options -> No permission
  it("updateNoteOptions -> Status 401", async () => {
    const noteRepository = { save: jest.fn().mockReturnValue(note), findOne: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const newOptions = new NoteOptions()
    newOptions.encrypted = true

    const context = ({
      status: undefined,
      body: newOptions,
      request: { body: newOptions },
      state: { user: { sub: "nicht ich" } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteOptionsController.update(context)

    expect(context.status).toBe(401)
  })
  // Test: Show note options -> Note not found
  it("showNoteOptions -> Status 404", async () => {
    const noteRepository = { save: jest.fn().mockReturnValue(note), findOne: jest.fn().mockReturnValue(undefined) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const newOptions = new NoteOptions()
    newOptions.encrypted = true

    const context = ({
      status: undefined,
      body: newOptions,
      request: { body: newOptions },
      state: { user: { sub: user.id } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteOptionsController.show(context)

    expect(context.status).toBe(404)
  })
  // Test: Show note options -> No permission
  it("showNoteOptions -> Status 401", async () => {
    const noteRepository = { save: jest.fn().mockReturnValue(note), findOne: jest.fn().mockReturnValue(note) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const newOptions = new NoteOptions()
    newOptions.encrypted = true

    const context = ({
      status: undefined,
      body: newOptions,
      request: { body: newOptions },
      state: { user: { sub: "nicht ich" } },
      params: { id: note.id },
    } as unknown) as Context

    await NoteOptionsController.show(context)

    expect(context.status).toBe(401)
  })
})
