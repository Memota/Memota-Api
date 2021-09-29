import Router from "@koa/router"
import jwt from "koa-jwt"
import multer from "@koa/multer"
import compose from "koa-compose"

import { image } from "../controller"
import { config } from "../config"

const router = new Router()
const upload = multer({ limits: { fileSize: 1024 * 1024 } })

router.post("/", compose([upload.single("image"), jwt({ secret: config.jwtSecret })]), image.create)
router.get("/", jwt({ secret: config.jwtSecret }), image.index)
router.get("/:id", jwt({ secret: config.jwtSecret }), image.show)
router.delete("/:id", jwt({ secret: config.jwtSecret }), image.delete)

export { router as image }
