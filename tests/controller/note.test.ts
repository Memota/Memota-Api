import { Context, DefaultState, ParameterizedContext } from "koa"
import { ValidationError, validate } from "class-validator"
import { getManager, Not, OneToOne } from "typeorm"
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

  userInRepository = new User()
  userInRepository.email = user.email
  userInRepository.username = user.username
  userInRepository.password = user.password
  userInRepository.verified = true
  await userInRepository.hashPassword()
})

describe("Note controller", () => {
  it("createNote -> status 201", async () => {
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
    await NoteController.createNote(context)

    expect(userRepository.findOne).toHaveBeenCalledTimes(1)
    expect(noteRepository.save).toHaveBeenCalledTimes(1)

    expect(context.status).toBe(201)
    expect(context.body).toStrictEqual(note)
  })
  // Test: findOne -> return undefined as User
})
