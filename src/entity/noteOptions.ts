import { IsBoolean } from "class-validator"
import { Entity, Column, PrimaryGeneratedColumn, OneToOne } from "typeorm"
import { Note } from "./note"

@Entity()
export class NoteOptions {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @OneToOne(
    () => Note,
    note => note.sharedNote,
    {
      cascade: true,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  )
  note: Note

  @Column({ default: false })
  @IsBoolean()
  encrypted: boolean

  @Column({ default: false })
  @IsBoolean()
  pinned: boolean

  @Column({ default: false })
  @IsBoolean()
  hidden: boolean
}
