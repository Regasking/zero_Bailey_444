import { personality } from '../../utils/personality.js'
import QRCode from 'qrcode'

export default {
  name: 'qr',
  alias: ['qrcode'],
  desc: 'Générer un QR code',
  category: 'tools',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .qr <texte ou lien>'
      })
    }

    try {
      await sock.sendMessage(jid, { text: personality.format('loading') })

      const text = args.join(' ')
      const buffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: 512,
        margin: 2
      })

      await sock.sendMessage(jid, {
        image: buffer,
        caption: `🔲 QR Code généré\n\n— ${personality.format('success')}`
      })

    } catch (err) {
      console.error('[QR ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}