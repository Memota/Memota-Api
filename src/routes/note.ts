import Router from "@koa/router"
import jwt from "koa-jwt"

import { note } from "../controller"
import { config } from "../config"
import noteOptions from "../controller/noteOptions"

const router = new Router()

router.post("/", jwt({ secret: config.jwtSecret }), note.create)
router.get("/", jwt({ secret: config.jwtSecret }), note.index)
router.get("/download", jwt({ secret: config.jwtSecret }), note.downloadBackup)
router.get("/shared/:id", jwt({ secret: config.jwtSecret }), note.showShared)
router.post("/:id/shared", jwt({ secret: config.jwtSecret }), note.createShared)
router.put("/:id/image", jwt({ secret: config.jwtSecret }), note.updateImage)
router.delete("/:id/image", jwt({ secret: config.jwtSecret }), note.deleteImage)
router.delete("/:id/shared", jwt({ secret: config.jwtSecret }), note.deleteShared)
router.get("/:id/download", jwt({ secret: config.jwtSecret }), note.download)
router.get("/:id/options", jwt({ secret: config.jwtSecret }), noteOptions.show)
router.delete("/:id/options", jwt({ secret: config.jwtSecret }), noteOptions.update)
router.patch("/:id", jwt({ secret: config.jwtSecret }), note.update)
router.delete("/:id", jwt({ secret: config.jwtSecret }), note.delete)
router.get("/:id", jwt({ secret: config.jwtSecret }), note.show)

export { router as note }
