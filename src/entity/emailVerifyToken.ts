import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToOne, JoinColumn } from "typeorm"
import { User } from "./user"

@Entity()
export class EmailVerifyToken {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @OneToOne(
    type => User,
    User => User.verifyToken,
    {
      cascade: true,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn()
  user: User

  @Column({ length: 100 })
  token: string

  @CreateDateColumn()
  createdAt: Date
}
