import Router from "@koa/router"

import { user } from "../controller"

const router = new Router()

router.post("/register", user.createUser)
router.post("/verify/:token", user.verify)
router.post("/resend", user.resend)
router.post("/login", user.loginUser)

export { router as user }
