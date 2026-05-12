import { personality } from '../../utils/personality.js'
import { downloadMediaMessage } from 'baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export default {
  name: 'sticker',
  alias: ['s', 'stiker'],
  desc: 'Créer un sticker',
  category: 'tools',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid

    const mediaMsg = msg.message?.imageMessage
      || msg.message?.videoMessage
      || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
      || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage

    if (!mediaMsg) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nEnvoie ou reply une image/vidéo.'
      })
    }

    try {
      await sock.sendMessage(jid, { text: personality.format('loading') })

      // Construire le bon objet message
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      const quotedType = quotedMsg ? Object.keys(quotedMsg)[0] : null

      const msgToDownload = quotedType ? {
        key: {
          remoteJid: msg.key.remoteJid,
          id: msg.message.extendedTextMessage.contextInfo.stanzaId,
          fromMe: false
        },
        message: quotedMsg
      } : msg

      const buffer = await downloadMediaMessage(msgToDownload, 'buffer', {}, {
        reuploadRequest: sock.updateMediaMessage
      })

      const tmpIn = `./temp/sticker_in_${Date.now()}.webp`
      const tmpOut = `./temp/sticker_out_${Date.now()}.webp`

      fs.writeFileSync(tmpIn, buffer)

      await execAsync(`ffmpeg -i ${tmpIn} -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2" ${tmpOut}`)

      const stickerBuffer = fs.readFileSync(tmpOut)

      await sock.sendMessage(jid, {
        sticker: stickerBuffer
      })

      fs.unlinkSync(tmpIn)
      fs.unlinkSync(tmpOut)

    } catch (err) {
      console.error('[STICKER ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}