import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, CreateDateColumn, OneToMany } from "typeorm"
import { Length, IsEmail, IsOptional, ValidateIf, Matches, IsHexColor } from "class-validator"
import { IsUniq } from "@join-com/typeorm-class-validator-is-uniq"
import { hash, compare } from "bcrypt"

import { EmailVerifyToken } from "./emailVerifyToken"
import { PasswordResetToken } from "./passwordResetToken"
import { Note } from "./note"

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Matches(new RegExp("^[a-zA-Z0-9_]+$"), { groups: ["register", "patch"] })
  @Column({ length: 32, unique: true })
  @Length(3, 32, { groups: ["register", "login", "patch"] })
  @IsUniq({ groups: ["register"] })
  @ValidateIf(o => o.email == undefined, { groups: ["login"] })
  @IsOptional({ groups: ["patch"] })
  username: string

  @Column({ length: 64 })
  @Length(5, 64, { groups: ["register", "login", "password-reset"] })
  password: string

  @Column({ length: 64, unique: true })
  @Length(5, 64, { groups: ["register", "login", "resend", "send-reset"] })
  @IsEmail(undefined, { groups: ["register", "login", "resend", "send-reset"] })
  @IsUniq({ groups: ["register"] })
  @IsOptional({ groups: ["login"] })
  email: string

  @Column({ default: false })
  @IsOptional()
  verified: boolean

  @OneToOne(
    type => EmailVerifyToken,
    EmailVerifyToken => EmailVerifyToken.user,
  )
  verifyToken: EmailVerifyToken

  @OneToOne(
    type => PasswordResetToken,
    PasswordResetToken => PasswordResetToken.user,
  )
  resetToken: PasswordResetToken

  @Column({ length: 20, default: "user" })
  @Length(2, 20)
  @IsOptional()
  role: string

  @Column("simple-array", {
    default: "#FFFFFF,#ff9999,#ffcc99,#ffff99,#99ff99,#99ffcc,#99ffff,#99ccff,#9999ff,#cc99ff,#ff99ff",
  })
  @IsOptional()
  @Length(4, 7, { each: true, groups: ["patch"] })
  @IsHexColor({ each: true, groups: ["patch"] })
  noteColors: string[]

  @OneToMany(
    () => Note,
    note => note.user,
    {
      cascade: true,
    },
  )
  notes: Note[]

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date

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
