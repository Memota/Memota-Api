import Router from "@koa/router"
import jwt from "koa-jwt"
import multer from "@koa/multer"
import compose from "koa-compose"

import { image } from "../controller"
import { config } from "../config"

const router = new Router()
const upload = multer({ limits: { fileSize: 1024 * 1024 } })

router.post("/", compose([upload.single("image"), jwt({ secret: config.jwtSecret })]), image.create)
router.get("/:id", jwt({ secret: config.jwtSecret }), image.show)

export { router as image }
