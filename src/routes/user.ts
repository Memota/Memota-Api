import Router from "@koa/router"

import { user } from "../controller"

const router = new Router()

router.post("/register", user.createUser)

export { router as user }
