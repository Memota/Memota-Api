import { Length } from "class-validator"
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from "typeorm"

import { User } from "./user"
import { Note } from "./note"
import { Settings } from "./settings"

@Entity()
export class Image {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("bytea", { nullable: false })
  buffer: Buffer

  @Column({ length: 50 })
  @Length(0, 50)
  mimetype: string

  @OneToOne(
    () => Settings,
    settings => settings.image,
    {
      onDelete: "CASCADE",
    },
  )
  settings: Settings

  @ManyToOne(
    () => User,
    user => user.images,
    {
      onDelete: "CASCADE",
    },
  )
  user: User

  @OneToMany(
    () => Note,
    note => note.image,
    {
      cascade: true,
    },
  )
  notes: Note[]

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date
}
