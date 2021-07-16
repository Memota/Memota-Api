import Router from "@koa/router"
import jwt from "koa-jwt"

import { note } from "../controller"
import { config } from "../config"

const router = new Router()

router.post("/", jwt({ secret: config.jwtSecret }), note.create)
router.get("/", jwt({ secret: config.jwtSecret }), note.index)
router.post("/:id/shared", jwt({ secret: config.jwtSecret }), note.createShared)
router.delete("/:id/shared", jwt({ secret: config.jwtSecret }), note.deleteShared)
router.patch("/:id", jwt({ secret: config.jwtSecret }), note.update)
router.delete("/:id", jwt({ secret: config.jwtSecret }), note.delete)
router.get("/:id", jwt({ secret: config.jwtSecret }), note.show)

export { router as note }
