import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from "typeorm"
import { Length, IsEmail, IsOptional, ValidateIf } from "class-validator"
import { IsUniq } from "@join-com/typeorm-class-validator-is-uniq"

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ length: 80, unique: true })
  @Length(3, 80, { groups: ["register", "login", "send-reset"] })
  @IsUniq({ groups: ["register"] })
  @ValidateIf(o => o.email == undefined, { groups: ["login", "send-reset"] })
  username: string

  @Column({ length: 100 })
  @Length(5, 60, { groups: ["register", "login"] })
  password: string

  @Column({ length: 100, unique: true })
  @Length(10, 100, { groups: ["register", "login", "resend", "send-reset"] })
  @IsEmail(undefined, { groups: ["register", "login", "resend", "send-reset"] })
  @IsUniq({ groups: ["register"] })
  @IsOptional({ groups: ["login", "send-reset"] })
  email: string

  @Column({ default: false })
  @IsOptional()
  verified: boolean

  @Column({ length: 20, default: "user" })
  @Length(2, 20)
  @IsOptional()
  role: string
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
