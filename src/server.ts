import Koa from "koa"
import helmet from "koa-helmet"
import { createConnection } from "typeorm"
import koaBody from "koa-body"
import * as PostgressConnectionStringParser from "pg-connection-string"

import { config } from "./config"
import { router } from "./routes"

const connectionOptions = PostgressConnectionStringParser.parse(config.databaseUrl)

createConnection({
  type: "postgres",
  host: connectionOptions.host,
  port: +connectionOptions.port,
  username: connectionOptions.user,
  password: connectionOptions.password,
  database: connectionOptions.database,
  synchronize: true,
  logging: false,
  entities: config.dbEntitiesPath,
  extra: {
    ssl: connectionOptions.ssl === undefined ? true : connectionOptions.ssl == "true", // Defaults to true when it isn't set in connection string
  },
})
  .then(connection => {
    const app = new Koa()

    // Adds various security headers
    //app.use(helmet())

    // Adds CORS header
    app.use(async (ctx, next) => {
      ctx.set("Access-Control-Allow-Origin", "*")
      ctx.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
      ctx.set("Access-Control-Allow-Methods", "POST, GET, PUT, PATCH, DELETE, OPTIONS")
      await next()
    })

    // Parse request body
    app.use(koaBody())

    // Register routes
    app.use(router.routes()).use(router.allowedMethods())

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`)
    })
  })
  .catch(error => console.log("TypeORM connection error: ", error))
