import Router from "@koa/router"
import jwt from "koa-jwt"

import { note } from "../controller"
import { config } from "../config"

const router = new Router()

router.post("/", jwt({ secret: config.jwtSecret }), note.createNote)
router.get("/", jwt({ secret: config.jwtSecret }), note.getNotes)
router.patch("/:id", jwt({ secret: config.jwtSecret }), note.patchNote)
router.delete("/:id", jwt({ secret: config.jwtSecret }), note.deleteNote)

export { router as note }
