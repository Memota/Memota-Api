import { SwaggerRouter } from "koa-swagger-decorator"

import { user } from "../controller"

const router = new SwaggerRouter()

router.post("/register", user.createUser)

export { router as user }
