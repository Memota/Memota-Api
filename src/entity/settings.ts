import { IsBoolean, IsOptional } from "class-validator"
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm"

import { User } from "./user"
import { Image } from "./image"

@Entity()
export class Settings {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @OneToOne(
    () => User,
    user => user.settings,
    {
      onDelete: "CASCADE",
    },
  )
  user: User

  @JoinColumn()
  @OneToOne(
    () => Image,
    image => image.settings,
    {
      onDelete: "SET NULL",
      cascade: true,
    },
  )
  image: Image

  @Column({ default: false })
  @IsBoolean()
  @IsOptional({ groups: ["patch"] })
  darkMode: boolean

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date
}
