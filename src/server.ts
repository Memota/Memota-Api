import Koa from "koa"
import helmet from "koa-helmet"

import { config } from "./config"
import { router } from "./routes"

const app = new Koa()

// Adds various security headers
app.use(helmet())

// Adds CORS header
app.use(async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*")
  ctx.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  ctx.set("Access-Control-Allow-Methods", "POST, GET, PUT, PATCH, DELETE, OPTIONS")
  await next()
})

// Register routes
app.use(router.routes()).use(router.allowedMethods())

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
})
