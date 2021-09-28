import { config } from "./config"
import { User } from "./entity/user"
import { Note } from "./entity/note"
import { jsPDF } from "jspdf"
import JSZip = require("../node_modules/jszip")

export function generateNotePdf(note: Note): ArrayBuffer {
  const doc = new jsPDF()
  //TODO fat title, picture, then note text
  doc.text("Test", 15, 15)
  //doc.save("Test.pdf")
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
