import dotenv from "dotenv"

dotenv.config({ path: ".env" })

export interface Config {
  port: number
  databaseUrl: string
  dbEntitiesPath: string[]
  debugLogging: boolean
  baseUrl: string
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPass: string
  mailSender: string
}

const isDevMode = process.env.NODE_ENV == "development"

const config: Config = {
  port: +(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  dbEntitiesPath: [...(isDevMode ? ["src/entity/**/*.ts"] : ["dist/entity/**/*.js"])],
  debugLogging: isDevMode,
  baseUrl: process.env.BASE_URL,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT),
  smtpSecure: process.env.SMTP_SECURE == "true",
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailSender: process.env.MAIL_SENDER,
}

export { config }
