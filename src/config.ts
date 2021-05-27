import dotenv from "dotenv"

dotenv.config({ path: ".env" })

export interface Config {
  port: number
}

const isDevMode = process.env.NODE_ENV == "development"

const config: Config = {
  port: +(process.env.PORT || 3000),
}

export { config }
