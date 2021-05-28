import Koa from "koa"
import cors from "@koa/cors"

import { config } from "./config"
import helmet from "koa-helmet"

const app = new Koa()

app.use(
  helmet({
    contentSecurityPolicy: false,
    dnsPrefetchControl: false,
    expectCt: true,
    frameguard: true,
    hidePoweredBy: false,
    hsts: true,
    ieNoOpen: false,
    noSniff: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: false,
    xssFilter: false,
  }),
)

app.use(cors)

app.use(ctx => {
  ctx.body = "Hello World"
})

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
})
