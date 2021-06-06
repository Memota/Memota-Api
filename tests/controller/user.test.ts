import UserController from "../../src/controller/user"
import { User } from "../../src/entity/user"
import { EmailVerifyToken } from "../../src/entity/emailVerifyToken"
import { getManager, OneToOne } from "typeorm"
import { Context } from "koa"
import { ValidationError, validate } from "class-validator"
import { email } from "../../src/email"

let user: User
let token: EmailVerifyToken

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

jest.mock("@join-com/typeorm-class-validator-is-uniq", () => {
  const doNothing = () => {
    //Empty function that mocks typeorm annotations
  }
  return {
    IsUniq: doNothing,
  }
})

const emailMock = jest.fn()
jest.mock("../../src/email", () => {
  return {
    email: { send: (): void => emailMock() },
  }
})

beforeEach(() => {
  user = new User()
  user.id = "2c7cfd5b-e905-4493-83df-cf7b570db641"
  user.username = "Steve"
  user.email = "steve@example.com"
  user.password = "test123"
  user.verified = false

  token = new EmailVerifyToken()
  token.token = "000000"
  token.user = user
  token.createdAt = new Date(new Date().setDate(new Date().getDate() - 1))
  user.verifyToken = token

  emailMock.mockClear()
})

describe("User controller", () => {
  it("createUser -> status 201", async () => {
    const userRepository = { save: jest.fn().mockReturnValue(user) }
    const tokenRepository = { save: jest.fn().mockReturnValue(token) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({ status: undefined, body: undefined, request: { body: user } } as unknown) as Context
    await UserController.createUser(context)

    expect(userRepository.save).toHaveBeenCalledTimes(1)
    expect(tokenRepository.save).toHaveBeenCalledTimes(1)
    expect(emailMock).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(201)
    expect((context.body as User).password).toBeUndefined()
    expect(context.body).toStrictEqual(user)
  })
  it("verify -> Status 200", async () => {
    const tokenRepository = {
      save: jest.fn().mockReturnValue(token),
      remove: jest.fn().mockReturnValue(token),
      findOne: (): EmailVerifyToken => token,
    }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
      params: { token: token.token },
    } as unknown) as Context

    await UserController.verify(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(1)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(1)
    expect(user.verified).toBeTruthy()
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual("Account verified")
  })
  it("verify with wrong token -> Status 400", async () => {
    const tokenRepository = {
      save: jest.fn().mockReturnValue(token),
      remove: jest.fn().mockReturnValue(token),
      findOne: (): EmailVerifyToken => undefined as EmailVerifyToken,
    }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
      params: { token: token.token },
    } as unknown) as Context

    await UserController.verify(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(user.verified).toBeFalsy()
    expect(context.status).toBe(400)
    expect(context.body).toStrictEqual("The specified token was not found")
  })
  it("resend -> Status 200", async () => {
    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(token), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await UserController.resend(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(1)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(1)
    expect(emailMock).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual("Email has been sent")
  })
  it("resend on already verified user -> Status 400", async () => {
    user.verified = true

    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(token), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await UserController.resend(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(emailMock).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(400)
    expect(context.body).toStrictEqual("The specified email was not found or the user is already verified")
  })
  it("resend on non existing user -> Status 400", async () => {
    const userRepository = { findOne: (): User => undefined as User, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(token), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await UserController.resend(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(emailMock).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(400)
    expect(context.body).toStrictEqual("The specified email was not found or the user is already verified")
  })
  it("resend on too new token -> Status 429", async () => {
    token.createdAt = new Date()

    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(token), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await UserController.resend(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(emailMock).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(429)
    expect(context.body).toStrictEqual("You have to wait before you can resend")
  })
})
