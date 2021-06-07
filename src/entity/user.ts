import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, CreateDateColumn } from "typeorm"
import { Length, IsEmail, IsOptional, ValidateIf, Matches } from "class-validator"
import { IsUniq } from "@join-com/typeorm-class-validator-is-uniq"
import { hash, compare } from "bcrypt"

import { EmailVerifyToken } from "./emailVerifyToken"

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Matches(new RegExp("^[a-zA-Z0-9_]+$"), { groups: ["register"] })
  @Column({ length: 32, unique: true })
  @Length(3, 32, { groups: ["register", "login", "send-reset"] })
  @IsUniq({ groups: ["register"] })
  @ValidateIf(o => o.email == undefined, { groups: ["login", "send-reset"] })
  username: string

  @Column({ length: 64 })
  @Length(5, 64, { groups: ["register", "login"] })
  password: string

  @Column({ length: 64, unique: true })
  @Length(5, 64, { groups: ["register", "login", "resend", "send-reset"] })
  @IsEmail(undefined, { groups: ["register", "login", "resend", "send-reset"] })
  @IsUniq({ groups: ["register"] })
  @IsOptional({ groups: ["login", "send-reset"] })
  email: string

  @Column({ default: false })
  @IsOptional()
  verified: boolean

  @OneToOne(
    type => EmailVerifyToken,
    EmailVerifyToken => EmailVerifyToken.user,
  )
  verifyToken: EmailVerifyToken

  @Column({ length: 20, default: "user" })
  @Length(2, 20)
  @IsOptional()
  role: string

  async hashPassword() {
    this.password = await hash(this.password, 10)
  }

  async compareHash(password: string): Promise<boolean> {
    return compare(password, this.password)
  }
}

export const userSchema = {
  username: { type: "string", required: true, example: "Memota" },
  password: { type: "string", required: true, example: "s3cur3passw0rd" },
  email: { type: "string", required: true, example: "memota@gmail.com" },
}
export const loginSchema = {
  password: { type: "string", required: true, example: "s3cur3passw0rd" },
  email: { type: "string", required: true, example: "memota@gmail.com" },
}
