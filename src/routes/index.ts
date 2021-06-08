import Router from "@koa/router"
import { user } from "./user"

const router = new Router()

// Include all routes
router.use("/users", user.routes()).use(user.allowedMethods())

export { router }
