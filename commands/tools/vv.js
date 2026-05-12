import { downloadMediaMessage } from 'baileys'
import { personality } from '../../utils/personality.js'

export default {
  name: 'vv',
  alias: ['readvo', 'read', 'antiview'],
  desc: 'Révèle un message view-once',
  category: 'tools',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

    if (!quoted) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nReply à un message view-once.'
      })
    }

    const viewOnceMsg = quoted.viewOnceMessage?.message
      || quoted.viewOnceMessageV2?.message
      || quoted.viewOnceMessageV2Extension?.message

    const directImage = quoted.imageMessage?.viewOnce ? quoted.imageMessage : null
    const directVideo = quoted.videoMessage?.viewOnce ? quoted.videoMessage : null
    const directAudio = quoted.audioMessage?.viewOnce ? quoted.audioMessage : null

    if (!viewOnceMsg && !directImage && !directVideo && !directAudio) {
      return sock.sendMessage(jid, {
        text: '❌ Ce message n\'est pas un view-once.'
      })
    }

    try {
      await sock.sendMessage(jid, { text: personality.format('loading') })

      let type, mediaMsg

      if (viewOnceMsg) {
        type = Object.keys(viewOnceMsg)[0]
        mediaMsg = viewOnceMsg[type]
      } else {
        mediaMsg = directImage || directVideo || directAudio
        type = directImage ? 'imageMessage' : directVideo ? 'videoMessage' : 'audioMessage'
      }

      const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId

      const fakeMsg = {
        key: stanzaId ? { remoteJid: jid, id: stanzaId, fromMe: false } : msg.key,
        message: { [type]: mediaMsg }
      }

      const buffer = await Promise.race([
        downloadMediaMessage(fakeMsg, 'buffer', {}, {
          reuploadRequest: sock.updateMediaMessage
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000)
        )
      ])

      if (type === 'imageMessage') {
        await sock.sendMessage(jid, {
          image: buffer,
          caption: `👁️ *View-once révélé*\n\n— ${personality.format('success')}`
        })
      } else if (type === 'videoMessage') {
        await sock.sendMessage(jid, {
          video: buffer,
          caption: `👁️ *View-once révélé*\n\n— ${personality.format('success')}`
        })
      } else if (type === 'audioMessage') {
        await sock.sendMessage(jid, {
          audio: buffer,
          mimetype: 'audio/mp4',
          ptt: true
        })
      }

    } catch (err) {
      console.error('[VV ERROR]', err.message)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}