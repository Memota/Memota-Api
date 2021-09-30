import { User } from "./entity/user"
import { Note } from "./entity/note"
import { Font, jsPDF } from "jspdf"
import JSZip = require("../node_modules/jszip")
import * as fs from "fs"

const darkColorMatcher = new RegExp("^#([0-7][0-9a-fA-F]){3}")

// Inspired by https://www.codegrepper.com/code-examples/javascript/hex+to+rgb+typescript
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

// Source: https://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
function toBuffer(ab: ArrayBuffer) {
  const buf = Buffer.alloc(ab.byteLength)
  const view = new Uint8Array(ab)
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i]
  }
  return buf
}

export default class FileGenerator {
  public static generateNotePdf(note: Note, withImage: boolean, colored: boolean): Buffer {
    const doc = new jsPDF("portrait", "px", "a4")
    const defaultFont = doc.getFont()
    const docWidth = doc.internal.pageSize.getWidth()
    const docHeight = doc.internal.pageSize.getHeight()
    const leftIndent = 20

    // Background and text color
    let noteColor
    // If the note color should be applied to the document pages
    if (colored) {
      noteColor = hexToRgb(note.color)
      darkColorMatcher.test(note.color) ? doc.setTextColor(255, 255, 255) : doc.setTextColor(0, 0, 0)
    } else {
      noteColor = hexToRgb("#ffffff")
    }
    this.fillBackground(doc, docWidth, docHeight, noteColor)

    // Memota Logo
    const logo = fs.readFileSync("assets/logo.png", null).buffer
    doc.addImage(new Uint8Array(logo), "PNG", docWidth - 48, 5, 40, 40)

    // Note title in bold
    doc.setFont(undefined, "bold")
    const titleEnd = this.wrapText(
      doc,
      doc.getFont(),
      doc.getFontSize(),
      note.title,
      20,
      docWidth,
      docHeight,
      320,
      12,
      leftIndent,
      noteColor,
    )

    // Creation Date
    doc.setFont(defaultFont.fontName, "italic")
    doc.setFontSize(8)
    doc.text("Created on " + new Date().toLocaleString(), leftIndent, titleEnd)

    let imageEnd = 60 // default
    if (withImage) {
      //TODO Note Image
      // Note image
      // get note image from repository
      //if(note.image)
      //const image = undefined
      /*function loadImage(url) {
        return new Promise((resolve) => {
          img.onload = () => resolve(img);
          img.src = url;
        })
      }
      doc.addImage(imgData, "JPEG", leftIndent, titleEnd, 0, 0, undefined, "FAST")
     */
      imageEnd = 60
    }

    // Note text
    doc.setFont(defaultFont.fontName, defaultFont.fontStyle)
    doc.setFontSize(14)
    this.wrapText(doc, defaultFont, 12, note.text, imageEnd, docWidth, docHeight, 450, 10, leftIndent, noteColor)

    return toBuffer(doc.output("arraybuffer"))
  }

  // call function before drawing text
  static fillBackground(
    doc: jsPDF,
    width: number,
    height: number,
    pageColor: {
      r: number
      g: number
      b: number
    },
  ) {
    doc.setFillColor(pageColor.r, pageColor.g, pageColor.b)
    // draw full page rectangle to fill it
    doc.rect(0, 0, width, height, "F")
  }

  static wrapText(
    doc: jsPDF,
    font: Font,
    fontSize: number,
    text: string,
    textStart: number,
    docWidth: number,
    docHeight: number,
    wrapWidth: number,
    lineSpacing: number,
    leftIndent: number,
    pageColor: {
      r: number
      g: number
      b: number
    },
  ): number {
    // split text string into array of sentences according to wrap width
    const splitText = doc.splitTextToSize(text, wrapWidth)
    doc.setFont(font.fontName, font.fontStyle)
    doc.setFontSize(fontSize)
    let y = textStart // y is for spacing between lines
    let pageNumber = 1
    for (let i = 0; i < splitText.length; i++) {
      // when end of the page is reached
      if (y > docHeight - lineSpacing) {
        y = 20 // top indentation on new page
        if (pageNumber == 1) doc.text(pageNumber.toString(), docWidth - 15, docHeight - lineSpacing)
        doc.addPage()
        this.fillBackground(doc, docWidth, docHeight, pageColor)
        pageNumber++
        doc.text(pageNumber.toString(), docWidth - 15, docHeight - lineSpacing)
      }
      doc.text(splitText[i], leftIndent, y)
      y = y + lineSpacing
    }
    return y
  }

  public static async generateBackupZip(user: User, withImages: boolean, colored: boolean): Promise<Buffer> {
    const zip = new JSZip()
    let untitledCount = 0
    user.notes.forEach(note => {
      const doc = this.generateNotePdf(note, withImages, colored)
      try {
        let pdfName
        if (note.title && note.title != "") {
          pdfName = note.title.toLocaleLowerCase().replace(/ /g, "-")
        } else {
          untitledCount == 0 ? (pdfName = "untitled") : (pdfName = "untitled (" + untitledCount + ")")
          zip.file(pdfName + ".pdf", doc)
          untitledCount++
        }
        zip.file(pdfName + ".pdf", doc)
      } catch (err) {
        console.log(err)
      }
    })

    return zip.generateAsync({ type: "nodebuffer" }).then(function(content) {
      return content
    })
  }
}
