import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'
import Tesseract from 'tesseract.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TMP = path.join(__dirname, '../../tmp')

if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

export default {
  name: 'ocr',
  alias: ['readimage', 'scan'],
  desc: 'Extraire le texte d\'une image',
  category: 'tools',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid

    // Récupérer l'image — soit en direct soit en reply
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const imageMsg = msg.message?.imageMessage
      || quoted?.imageMessage

    if (!imageMsg) {
      return sock.sendMessage(jid, {
        text: `📸 *OCR — Lecture de texte*\n\n*Utilisation :*\n▸ Envoie une image avec *${config.prefix}ocr* en légende\n▸ Ou reply sur une image avec *${config.prefix}ocr*\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    const waiting = await sock.sendMessage(jid, {
      text: `🔍 Analyse de l'image en cours...`
    }, { quoted: msg })

    try {
      // Télécharger l'image
      const buffer = await sock.downloadMediaMessage(
        quoted?.imageMessage ? { message: { imageMessage: quoted.imageMessage }, key: msg.key } : msg
      )

      const tmpFile = path.join(TMP, `ocr_${Date.now()}.jpg`)
      fs.writeFileSync(tmpFile, buffer)

      // OCR avec Tesseract (détection automatique de langue)
      const { data } = await Tesseract.recognize(tmpFile, 'fra+eng+spa', {
        logger: () => {}
      })

      // Nettoyer le fichier temp
      fs.unlinkSync(tmpFile)

      const text = data.text?.trim()

      if (!text || text.length < 2) {
        return sock.sendMessage(jid, {
          text: `❌ Aucun texte détecté dans cette image.\n\nEssaie avec une image plus nette ou un meilleur contraste.\n\n— *${config.botName}*`
        }, { quoted: msg })
      }

      await sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  📝  O C R  R É S U L T A T\n╚══════════════════════╝\n\n${text}\n\n━━━━━━━━━━━━━━━━━━━━━\n*Confiance :* ${Math.round(data.confidence)}%\n\n— *${config.botName}*`
      }, { quoted: msg })

    } catch (err) {
      console.error('[OCR ERROR]', err)
      await sock.sendMessage(jid, {
        text: `⚠️ Erreur lors de l'analyse. Réessaie avec une autre image.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }
  }
}