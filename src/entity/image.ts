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
  PrimaryColumn,
} from "typeorm"
import { User } from "./user"
import { SharedNote } from "./sharedNote"

@Entity()
export class Image {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column("bytea", { nullable: false })
  buffer: Buffer

  @Column({ length: 50 })
  @Length(0, 50)
  mimetype: string

  @ManyToOne(
    () => User,
    user => user.notes,
    {
      onDelete: "CASCADE",
    },
  )
  user: User

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date
}
