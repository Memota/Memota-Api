import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToOne, JoinColumn } from "typeorm"
import { User } from "./user"

@Entity()
export class PasswordResetToken {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @OneToOne(
    type => User,
    User => User.resetToken,
    {
      cascade: true,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn()
  user: User

  @Column({ length: 100 })
  token: string

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date
}
