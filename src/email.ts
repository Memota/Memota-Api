import nodemailer from "nodemailer"
import Email from "email-templates"

import { config } from "./config"
import { User } from "./entity/user"
import { PasswordResetToken } from "./entity/passwordResetToken"

// create an SMTP transporter to send Mails
const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
})

// Prepare Mailer default settings
const email = new Email({
  message: {
    from: config.mailSender,
  },
  transport: transporter,
  send: true,
  preview: false,
})

export async function sendVerifyMail(user: User, token: PasswordResetToken): Promise<void> {
  await email.send({
    template: "verify",
    message: {
      to: user.email,
    },
    locals: {
      uname: user.username,
      token: token.token,
      vurl: config.baseUrl + "auth/verify/",
    },
  })
}

export async function sendResetMail(user: User, token: PasswordResetToken): Promise<void> {
  await email.send({
    template: "reset",
    message: {
      to: user.email,
    },
    locals: {
      uname: user.username,
      token: token.token,
      rurl: config.baseUrl + "auth/reset/",
    },
  })
}
