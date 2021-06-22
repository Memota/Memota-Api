import { IsOptional, Length } from "class-validator"
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, UpdateDateColumn } from "typeorm"
import { User } from "./user"

@Entity()
export class Note {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToOne(
    () => User,
    user => user.notes,
    {
      onDelete: "CASCADE",
    },
  )
  user: User

  @Column({ length: 50 })
  @Length(0, 50)
  @IsOptional({ groups: ["patch"] })
  title: string

  @Column({ length: 10000 })
  @Length(0, 10000)
  @IsOptional({ groups: ["patch"] })
  text: string

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date
}
