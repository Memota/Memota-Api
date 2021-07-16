import { IsHexColor, IsOptional, Length } from "class-validator"
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm"
import { User } from "./user"
import { SharedNote } from "./sharedNote"

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

  // #fff or #ffffff
  @Column({ length: 7, default: "#ffffff" })
  @Length(4, 7)
  @IsHexColor()
  @IsOptional({ groups: ["patch"] })
  color: string

  @OneToOne(
    () => SharedNote,
    sharedNote => sharedNote.note,
    {
      onDelete: "SET NULL",
    },
  )
  @JoinColumn()
  sharedNote: SharedNote

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date
}
