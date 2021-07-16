import { CreateDateColumn, Entity, Column, OneToOne, PrimaryGeneratedColumn } from "typeorm"
import { Note } from "./note"
import { IsDate, IsOptional } from "class-validator"

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

  @Column({ type: "timestamptz", nullable: true })
  @IsOptional()
  @IsDate()
  expiresAt: Date

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date
}
