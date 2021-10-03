import { Context } from "koa"
import { getManager } from "typeorm"

import { User } from "../../src/entity/user"
import ImageController from "../../src/controller/image"
import { Image } from "../../src/entity/image"

let user: User
let image: Image

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

jest.mock("@join-com/typeorm-class-validator-is-uniq", () => {
  const doNothing = () => {
    //Empty function that mocks typeorm annotations
  }
  return {
    IsUniq: doNothing,
  }
})

beforeEach(() => {
  image = new Image()
  image.mimetype = "application/jpeg"
  image.buffer = Buffer.from("test")
  image.id = "3e8a1e8c-e27c-41f5-b434-8ebea6c33806"

  user = new User()
  user.id = "2c7cfd5b-e905-4493-83df-cf7b570db641"
  user.username = "Steve"
  user.email = "steve@example.com"
  user.password = "test123"
  user.verified = false
})

describe("User controller", () => {
  it("createImage -> status 201", async () => {
    const imageRepository = { save: jest.fn().mockReturnValue(image) }
    const userRepository = { findOne: (): User => user }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
    } as unknown) as Context
    await ImageController.create(context)

    expect(imageRepository.save).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(201)
    expect(context.body).toBe(image.id)
  })
  it("createImage -> status 401", async () => {
    const imageRepository = { save: jest.fn().mockReturnValue(image) }
    const userRepository = { findOne: (): undefined => undefined }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
    } as unknown) as Context
    await ImageController.create(context)

    expect(imageRepository.save).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
    expect(context.body).toBe("User not found")
  })
  it("showImage -> status 200", async () => {
    image.user = user

    const imageRepository = { findOne: jest.fn().mockReturnValue(image) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      params: { id: image.id },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      response: { set: () => {} },
    } as unknown) as Context
    await ImageController.show(context)

    expect(imageRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toBe(image.buffer)
  })
  it("showImage -> status 404", async () => {
    image.user = user

    const imageRepository = { findOne: (): undefined => undefined }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      params: { id: image.id },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      response: { set: () => {} },
    } as unknown) as Context
    await ImageController.show(context)

    expect(context.status).toBe(404)
    expect(context.body).toBe("Note not found")
  })
  it("indexImage -> status 200", async () => {
    user.images = [image]
    const userRepository = { findOne: jest.fn().mockReturnValue(user) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      params: { id: image.id },
    } as unknown) as Context
    await ImageController.index(context)

    expect(userRepository.findOne).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual([image.id])
  })
  it("indexImage -> status 404", async () => {
    user.images = [image]
    const userRepository = { findOne: (): undefined => undefined }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => userRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      params: { id: image.id },
    } as unknown) as Context
    await ImageController.index(context)

    expect(context.status).toBe(404)
    expect(context.body).toStrictEqual("No permission")
  })
  it("deleteImage -> status 200", async () => {
    image.user = user
    const imageRepository = { findOne: jest.fn().mockReturnValue(image), remove: jest.fn().mockReturnValue(image) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      params: { id: image.id },
    } as unknown) as Context
    await ImageController.delete(context)

    expect(imageRepository.findOne).toHaveBeenCalledTimes(1)
    expect(imageRepository.remove).toHaveBeenCalledTimes(1)
    expect(context.status).toBe(200)
    expect(context.body).toStrictEqual("Image deleted")
  })
  it("deleteImage -> status 404", async () => {
    image.user = user
    const imageRepository = { findOne: (): undefined => undefined, remove: jest.fn().mockReturnValue(image) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      params: { id: image.id },
    } as unknown) as Context
    await ImageController.delete(context)

    expect(imageRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(404)
    expect(context.body).toStrictEqual("Note not found")
  })
  it("deleteImage -> status 401", async () => {
    const testUser = new User()
    testUser.id = "ca4bff11-d083-4e75-87e3-3e8e385f08b1"
    image.user = testUser

    const imageRepository = { findOne: jest.fn().mockReturnValue(image), remove: jest.fn().mockReturnValue(image) }
    ;(getManager as jest.Mock).mockReturnValueOnce({ getRepository: () => imageRepository })

    const context = ({
      file: image,
      state: { user: { sub: user.id } },
      status: undefined,
      body: undefined,
      params: { id: image.id },
    } as unknown) as Context
    await ImageController.delete(context)

    expect(imageRepository.findOne).toHaveBeenCalledTimes(1)
    expect(imageRepository.remove).toHaveBeenCalledTimes(0)
    expect(context.status).toBe(401)
    expect(context.body).toStrictEqual("No permission")
  })
})
