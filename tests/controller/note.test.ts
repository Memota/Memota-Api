import { Context, DefaultState, ParameterizedContext } from "koa"
import { ValidationError, validate } from "class-validator"
import { getManager, Not, OneToOne, SimpleConsoleLogger } from "typeorm"
import jwt from "jsonwebtoken"

import { User } from "../../src/entity/user"
import { Note } from "../../src/entity/note"
import NoteController from "../../src/controller/note"

let user: User
let userInRepository: User
let note: Note

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

  note = new Note()
  note.title = "My Tasks"
  note.text = "Do the dishes"
  note.user = user
  note.id = "9n2cfd5b-e905-4493-83df-cf7b570db4f0"
  note.color = "#ffffff"
  user.notes = [note]

  userInRepository = new User()
  userInRepository.email = user.email
  userInRepository.username = user.username
  userInRepository.password = user.password
  userInRepository.verified = true
  await userInRepository.hashPassword()
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
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
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
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
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
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
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
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
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
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
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
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => noteRepository })
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
})
