import { Context, DefaultState, ParameterizedContext } from "koa"
import { ValidationError, validate } from "class-validator"
import { getManager, OneToOne } from "typeorm"

import UserController from "../../src/controller/user"
import { User } from "../../src/entity/user"

let user: User
let userInRepository: User

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
})

describe("User controller", () => {
  it("getProfile -> status 200", async () => {
    const userRepository = { findOne: (): User => user }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })

    const context = ({
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context
    await UserController.getProfile(context)

    expect(context.status).toBe(200)
    expect((context.body as User).password).toBeUndefined()
    expect(context.body).toStrictEqual(user)
  })
  it("getProfile -> status 401", async () => {
    const userRepository = { findOne: (): User => undefined }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })

    const context = ({
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      request: { body: user },
    } as unknown) as Context
    await UserController.getProfile(context)

    expect(context.status).toBe(401)
    expect(context.body).toStrictEqual("User not found")
  })
})
