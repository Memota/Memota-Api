import { User } from "../../src/entity/user"

test("user", async () => {
  const user = new User()
  user.username = "Steve"
  user.email = "steve@example.com"
  user.password = "password123"
  expect(user.username).toBe("Steve")
  expect(user.email).toBe("steve@example.com")
  expect(user.password).toBe("password123")
  await user.hashPassword()
  expect(user.password).not.toBe("password123")
})
