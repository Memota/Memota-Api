import Router from "@koa/router"
import { user } from "./user"
import { auth } from "./auth"
import { note } from "./note"

const router = new Router()

// Include all routes
router.use("/users", user.routes()).use(user.allowedMethods())
router.use("/auth", auth.routes()).use(auth.allowedMethods())
router.use("/notes", note.routes()).use(note.allowedMethods())

export { router }
