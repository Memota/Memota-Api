import dotenv from "dotenv"

dotenv.config({ path: ".env" })

export interface Config {
  port: number
  databaseUrl: string
  dbEntitiesPath: string[]
}

const isDevMode = process.env.NODE_ENV == "development"

const config: Config = {
  port: +(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  dbEntitiesPath: [...(isDevMode ? ["src/entity/**/*.ts"] : ["dist/entity/**/*.js"])],
}

export { config }
