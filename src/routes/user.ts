import Router from "@koa/router"
import jwt from "koa-jwt"

import { user } from "../controller"
import { config } from "../config"

const router = new Router()

router.get("/profile", jwt({ secret: config.jwtSecret }), user.getProfile)

export { router as user }
