import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMG_PATH = path.join(__dirname, '../assets/sanction.jpg')

let _imgBuffer = null

function getBuffer() {
  if (_imgBuffer) return _imgBuffer
  try {
    _imgBuffer = fs.readFileSync(IMG_PATH)
    return _imgBuffer
  } catch {
    return null
  }
}

/**
 * Envoie un message de sanction avec l'image Escanor
 * Si l'image est indisponible, envoie le texte seul
 */
export async function sendSanction(sock, jid, text, options = {}) {
  const buf = getBuffer()
  if (buf) {
    return sock.sendMessage(jid, { image: buf, caption: text }, options)
  }
  return sock.sendMessage(jid, { text }, options)
}
