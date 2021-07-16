import { CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm"
import { Note } from "./note"

@Entity()
export class SharedNote {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @OneToOne(
    () => Note,
    note => note.sharedNote,
    {
      cascade: true,
      onDelete: "CASCADE",
    },
  )
  note: Note

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date
}
