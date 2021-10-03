import fs from "fs"

import FileGenerator, { hexToRgb, toBuffer } from "../../src/utils/pdf"
import { User } from "../../src/entity/user"
import { Image } from "../../src/entity/image"
import { Note } from "../../src/entity/note"
import { NoteOptions } from "../../src/entity/noteOptions"

let user: User
let image: Image
let note: Note
let testImageArrayBuffer: ArrayBuffer
let samplePDF: Buffer

beforeEach(() => {
  image = new Image()
  image.mimetype = "application/jpeg"
  image.id = "3e8a1e8c-e27c-41f5-b434-8ebea6c33806"
  testImageArrayBuffer = fs.readFileSync("assets/logo.png", null).buffer
  image.buffer = toBuffer(testImageArrayBuffer)

  user = new User()
  user.id = "2c7cfd5b-e905-4493-83df-cf7b570db641"
  user.username = "Steve"
  user.email = "steve@example.com"
  user.password = "test123"
  user.verified = false

  note = new Note()
  note.image = image
  note.title = "My Tasks"
  note.text = "Do the dishes"
  note.user = user
  note.id = "9n2cfd5b-e905-4493-83df-cf7b570db4f0"
  note.color = "#ffffff"
  note.options = new NoteOptions()
  note.options.encrypted = false
  user.notes = [note]

  samplePDF = toBuffer(fs.readFileSync("assets/samplePDF.pdf", null).buffer)
})

it("hexToRgb test white", () => {
  const white = hexToRgb("#ffffff")
  const expected = { r: 255, g: 255, b: 255 }
  expect(white).toStrictEqual(expected)
})
it("hexToRgb test black", () => {
  const black = hexToRgb("#000")
  const expected = { r: 0, g: 0, b: 0 }
  expect(black).toStrictEqual(expected)
})
it("hexToRgb test mixed color", () => {
  const lightGreen = hexToRgb("#45bd33")
  const expected = { r: 69, g: 189, b: 51 }
  expect(lightGreen).toStrictEqual(expected)
})
it("toBuffer -> success", () => {
  const result = toBuffer(testImageArrayBuffer)
  expect(result).not.toBeNull()
  expect(result).toBeInstanceOf(Buffer)
})
it("generateNotePdf -> success", () => {
  const pdf = FileGenerator.generateNotePdf(note, true, true)
  expect(pdf).not.toBeNull()
  // A small change in text would make the generated pdf different from the sample (visible in first 200 symbols)
  expect(pdf.toString().substring(0, 200)).toEqual(samplePDF.toString().substring(0, 200))
  expect(pdf.toString().length).toEqual(samplePDF.toString().length)
})
it("generateNotePdf -> no image", () => {
  const pdf = FileGenerator.generateNotePdf(note, false, true)
  expect(pdf).not.toBeNull()
  // Text is still there
  expect(pdf.toString().substring(0, 200)).toEqual(samplePDF.toString().substring(0, 200))
  // Image is missing
  expect(pdf.toString().length).not.toEqual(samplePDF.toString().length)
})
it("generateNotePdf -> not colored", () => {
  // PDF background would be colored black, but setting colored false should prevent this
  note.color = "#000"
  const pdf = FileGenerator.generateNotePdf(note, true, false)
  expect(pdf).not.toBeNull()
  // PDFs should look the same
  expect(pdf.toString().substring(0, 200)).toEqual(samplePDF.toString().substring(0, 200))
  expect(pdf.toString().length).toEqual(samplePDF.toString().length)
})
it("generateBackupZip -> success", async () => {
  const zip = await FileGenerator.generateBackupZip(user, true, true)
  expect(zip).not.toBeNull()
  // Zip should contains the pdf so it should be > 0.5mb [~500000 chars]
  expect(zip.toString().length).toBeGreaterThan(500000)
})
