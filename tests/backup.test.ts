import { Context, DefaultState, ParameterizedContext } from "koa"
import { ValidationError, validate } from "class-validator"
import { getManager, Not, OneToOne, SimpleConsoleLogger } from "typeorm"
import jwt from "jsonwebtoken"

import FileDownloader from "../src/backup"
