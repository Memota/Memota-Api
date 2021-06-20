import Router from "@koa/router"
import jwt from "koa-jwt"

import { user } from "../controller"
import { config } from "../config"

const router = new Router()

router.post("/register", user.createUser)
router.post("/verify/:token", user.verify)
router.post("/resend", user.resend)
router.post("/login", user.loginUser)
router.post("/send-reset", user.sendPasswordReset)
router.post("/reset", user.resetPassword)

router.get("/profile", jwt({ secret: config.jwtSecret }), user.getProfile)

export { router as user }
