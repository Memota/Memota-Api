import { SwaggerRouter } from "koa-swagger-decorator"
import { user } from "./user"

const router = new SwaggerRouter()



// Include all routes
router.use("/user", user.routes()).use(user.allowedMethods())

router.swagger({
  title: "memota-api",
  description: "Memota Notes App back-end",
  version: "1.0.0",
})

export { router }
