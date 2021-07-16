import Router from "@koa/router"
import jwt from "koa-jwt"

import { user, settings } from "../controller"
import { config } from "../config"

const router = new Router()

router.get("/profile", jwt({ secret: config.jwtSecret }), user.getProfile)
router.patch("/profile", jwt({ secret: config.jwtSecret }), user.update)

router.patch("/settings", jwt({ secret: config.jwtSecret }), settings.update)

export { router as user }
