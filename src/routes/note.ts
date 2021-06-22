import Router from "@koa/router"
import jwt from "koa-jwt"

import { note } from "../controller"
import { config } from "../config"

const router = new Router()

router.post("/", jwt({ secret: config.jwtSecret }), note.createNote)

export { router as note }
