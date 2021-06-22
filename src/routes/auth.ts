import Router from "@koa/router"
import { auth } from "../controller"

const router = new Router()

router.post("/register", auth.createUser)
router.post("/verify/:token", auth.verify)
router.post("/resend", auth.resend)
router.post("/login", auth.loginUser)
router.post("/send-reset", auth.sendPasswordReset)
router.post("/reset", auth.resetPassword)

export { router as auth }
