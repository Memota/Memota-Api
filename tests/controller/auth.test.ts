import { Context } from "koa"
import { validate } from "class-validator"
import { getManager } from "typeorm"
import jwt from "jsonwebtoken"

import AuthController from "../../src/controller/auth"
import { User } from "../../src/entity/user"
import { EmailVerifyToken } from "../../src/entity/emailVerifyToken"
import { PasswordResetToken } from "../../src/entity/passwordResetToken"

let user: User
let userInRepository: User
let verifyToken: EmailVerifyToken
let resetToken: PasswordResetToken

jest.mock("typeorm", () => {
  const doNothing = (): void => {
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

jest.mock("class-validator", () => {
  const doNothing = (): void => {
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

jest.mock("@join-com/typeorm-class-validator-is-uniq", () => {
  const doNothing = (): void => {
    //Empty function that mocks typeorm annotations
  }
  return {
    IsUniq: doNothing,
  }
})

jest.mock("../../src/email", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendVerifyMail: (): void => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendResetMail: (): void => {},
  }
})

jest.mock("../../src/config", () => {
  return {
    config: { jwtSecret: "test" },
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

  userInRepository = new User()
  userInRepository.email = user.email
  userInRepository.username = user.username
  userInRepository.password = user.password
  userInRepository.verified = true
  await userInRepository.hashPassword()

  verifyToken = new EmailVerifyToken()
  verifyToken.token = "000000"
  verifyToken.user = user
  verifyToken.createdAt = new Date(new Date().setDate(new Date().getDate() - 1))
  user.verifyToken = verifyToken

  resetToken = new PasswordResetToken()
  resetToken.token = "000000"
  resetToken.user = user
  resetToken.createdAt = new Date(new Date().setDate(new Date().getDate() + 1))
  user.resetToken = resetToken
})

describe("User controller", () => {
  it("createUser -> status 201", async () => {
    const userRepository = { save: jest.fn().mockReturnValue(user) }
    const tokenRepository = { save: jest.fn().mockReturnValue(verifyToken) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({ status: undefined, body: undefined, request: { body: user } } as unknown) as Context
    await AuthController.createUser(context)

    expect(userRepository.save).toHaveBeenCalledTimes(1)
    expect(tokenRepository.save).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(201)
    expect((context.body as User).password).toBeUndefined()
    expect(context.body).toStrictEqual(user)
  })
  it("verify -> Status 200", async () => {
    const tokenRepository = {
      save: jest.fn().mockReturnValue(verifyToken),
      remove: jest.fn().mockReturnValue(verifyToken),
      findOne: (): EmailVerifyToken => verifyToken,
    }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
      params: { token: verifyToken.token },
    } as unknown) as Context

    await AuthController.verify(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(1)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(1)
    expect(user.verified).toBeTruthy()
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual("Account verified")
  })
  it("verify with wrong token -> Status 400", async () => {
    const tokenRepository = {
      save: jest.fn().mockReturnValue(verifyToken),
      remove: jest.fn().mockReturnValue(verifyToken),
      findOne: (): EmailVerifyToken => undefined as EmailVerifyToken,
    }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
      params: { token: verifyToken.token },
    } as unknown) as Context

    await AuthController.verify(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(user.verified).toBeFalsy()
    expect(context.status).toBe(400)
    expect(context.body).toStrictEqual("The specified token was not found")
  })
  it("resend -> Status 200", async () => {
    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(verifyToken), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await AuthController.resend(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(1)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual("Email has been sent")
  })
  it("resend on already verified user -> Status 400", async () => {
    user.verified = true

    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(verifyToken), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await AuthController.resend(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(400)
    expect(context.body).toStrictEqual("The specified email was not found or the user is already verified")
  })
  it("resend on non existing user -> Status 400", async () => {
    const userRepository = { findOne: (): User => undefined as User, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(verifyToken), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await AuthController.resend(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(400)
    expect(context.body).toStrictEqual("The specified email was not found or the user is already verified")
  })
  it("resend on too new token -> Status 429", async () => {
    verifyToken.createdAt = new Date()

    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(verifyToken), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await AuthController.resend(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(429)
    expect(context.body).toStrictEqual("You have to wait before you can resend")
  })

  /////////////////////////////////////
  // Feature Login | Authentication  //
  /////////////////////////////////////

  it("loginUser -> status 200", async () => {
    const userRepository = { findOne: (): User => userInRepository }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({ status: undefined, body: undefined, request: { body: user } } as unknown) as Context
    await AuthController.loginUser(context)

    expect(context.status).toBe(200)
    const body = context.body as JwtResponseBody
    expect(jwt.verify(body.token, "test")).toBeTruthy()
  })
  it("login with wrong credentials -> status 400", async () => {
    user.password = "wrong"

    const userRepository = { findOne: (): User => userInRepository }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({ status: undefined, body: undefined, request: { body: user } } as unknown) as Context
    await AuthController.loginUser(context)

    expect(context.status).toBe(400)
    expect(context.body).toStrictEqual("Username/Email was not found or password is invalid")
  })
  it("login as unverified user> status 401", async () => {
    userInRepository.verified = false

    const userRepository = { findOne: (): User => userInRepository }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({ status: undefined, body: undefined, request: { body: user } } as unknown) as Context
    await AuthController.loginUser(context)

    expect(context.status).toBe(401)
    expect(context.body).toStrictEqual("Specified User has not been verified yet")
  })
  it("sendPasswordReset -> status 200", async () => {
    user.verified = true
    user.resetToken.createdAt = verifyToken.createdAt

    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(resetToken), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await AuthController.sendPasswordReset(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(1)
    // old reset token was removed
    expect(tokenRepository.remove).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual("Email has been sent")
  })
  it("send reset to non-existing user -> Status 401", async () => {
    const userRepository = { findOne: (): User => undefined as User, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(resetToken), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await AuthController.sendPasswordReset(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
    expect(context.body).toStrictEqual("User not found")
  })
  it("send reset to unverified user -> Status 401", async () => {
    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(resetToken), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await AuthController.sendPasswordReset(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
    expect(context.body).toStrictEqual("Specified User has not been verified yet")
  })
  it("send new reset request too soon -> Status 429", async () => {
    user.verified = true
    resetToken.createdAt = new Date()
    user.resetToken = resetToken

    const userRepository = { findOne: (): User => user, delete: jest.fn() }
    const tokenRepository = { save: jest.fn().mockReturnValue(resetToken), remove: jest.fn() }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context

    await AuthController.sendPasswordReset(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(429)
    expect(context.body).toStrictEqual("You have to wait before you can request another password reset")
  })
  it("resetPassword -> Status 200", async () => {
    const tokenRepository = {
      save: jest.fn().mockReturnValue(resetToken),
      remove: jest.fn().mockReturnValue(resetToken),
      findOne: (): PasswordResetToken => resetToken,
    }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
      params: { token: resetToken.token },
    } as unknown) as Context

    await AuthController.resetPassword(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(1)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual("Password has been reset")
  })
  it("reset password with token missing-> Status 200", async () => {
    const tokenRepository = {
      save: jest.fn().mockReturnValue(resetToken),
      remove: jest.fn().mockReturnValue(resetToken),
      findOne: (): PasswordResetToken => undefined,
    }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
      params: { token: resetToken.token },
    } as unknown) as Context

    await AuthController.resetPassword(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(400)
    expect(context.body).toStrictEqual("The specified token was not found")
  })
  it("reset password with too old token -> Status 401", async () => {
    // token is now older than the 2hr time limit
    resetToken.createdAt = verifyToken.createdAt
    const tokenRepository = {
      save: jest.fn().mockReturnValue(resetToken),
      remove: jest.fn().mockReturnValue(resetToken),
      findOne: (): PasswordResetToken => resetToken,
    }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => tokenRepository })
    ;(validate as jest.Mock).mockReturnValue([])

    const context = ({
      status: undefined,
      body: undefined,
      request: { body: user },
      params: { token: resetToken.token },
    } as unknown) as Context

    await AuthController.resetPassword(context)

    expect(tokenRepository.save).toHaveBeenCalledTimes(0)
    expect(tokenRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
    expect(context.body).toStrictEqual("This password reset token has expired")
  })
})
