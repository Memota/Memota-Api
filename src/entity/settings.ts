import { IsBoolean, IsHexColor, IsOptional, Length } from "class-validator"
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm"
import { User } from "./user"

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

  @Column({ default: false })
  @IsBoolean()
  @IsOptional({ groups: ["patch"] })
  darkMode: boolean

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date
}
