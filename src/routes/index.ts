import Router from "@koa/router"
import { user } from "./user"

const router = new Router()

// Include all routes
router.use("/user", user.routes()).use(user.allowedMethods())

export { router }
