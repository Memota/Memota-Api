import { User } from "./entity/user"
import { Note } from "./entity/note"
import { jsPDF } from "jspdf"
import JSZip = require("../node_modules/jszip")
import * as fs from "fs"

// inspired by https://www.codegrepper.com/code-examples/javascript/hex+to+rgb+typescript
const hexToRgb = (h: string) => {
  let [r, g, b] = [0, 0, 0]

  if (h.length == 4) {
    r = parseInt("0x" + h[1] + h[1])
    g = parseInt("0x" + h[2] + h[2])
    b = parseInt("0x" + h[3] + h[3])
  } else if (h.length == 7) {
    r = parseInt("0x" + h[1] + h[2])
    g = parseInt("0x" + h[3] + h[4])
    b = parseInt("0x" + h[5] + h[6])
  }

  return { r, g, b }
}

export function generateNotePdf(note: Note): ArrayBuffer {
  const doc = new jsPDF("portrait", "px", "a4")
  const defaultFont = doc.getFont()
  const docWidth = doc.internal.pageSize.getWidth()
  const docHeight = doc.internal.pageSize.getHeight()

  const noteColor = hexToRgb(note.color)
  doc.setFillColor(noteColor.r, noteColor.g, noteColor.b)
  doc.rect(0, 0, docWidth, docHeight, "F")

  // Memota Logo
  const logo = fs.readFileSync("assets/logo.png", null).buffer
  doc.addImage(new Uint8Array(logo), "PNG", docWidth - 48, 5, 40, 40)

  // Note title in bold + creation date
  doc.setFont(undefined, "bold")
  doc.text(note.title, 20, 30)
  doc.setFont(defaultFont.fontName, "italic")
  doc.setFontSize(8)
  doc.text("Created on " + new Date().toLocaleString(), 20, 40)

  //TODO Note Image
  // Note image (centered)
  //const img = undefined
  //doc.addImage(img, "JPEG", xSize / 2, ySize / 2)

  // Note text
  doc.setFont(defaultFont.fontName, defaultFont.fontStyle)
  doc.setFontSize(14)
  doc.text(note.text, 20, 60)

  doc.save("Test.pdf")
  return doc.output("arraybuffer")
  //TODO title = pdf name
}

export function generateBackupZip(user: User): ArrayBuffer {
  //TODO iterate through notes from user, generate pdfs, zip them
  const zip = new JSZip()

  //foreach loop
  const note = user.notes[0]
  const doc = generateNotePdf(note)
  if (typeof doc !== "undefined") {
    try {
      zip.file(note.title + ".pdf", doc)
    } catch {
      //error
    }
  }

  zip.generateAsync({ type: "arraybuffer" }).then(function(content) {
    //TODO return zip
    //saveAs(content, user.name + ".zip")
  })

  return undefined
}
