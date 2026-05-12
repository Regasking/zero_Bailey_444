import { personality } from '../../utils/personality.js'
import https from 'https'
import fs from 'fs'

export default {
  name: 'tts',
  alias: ['voice', 'vocal'],
  desc: 'Texte en vocal',
  category: 'tools',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .tts <texte>'
      })
    }

    const text = args.join(' ')
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=fr&client=tw-ob`

    try {
      await sock.sendMessage(jid, { text: personality.format('loading') })

      const tmpPath = `./temp/tts_${Date.now()}.mp3`

      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(tmpPath)
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
          res.pipe(file)
          file.on('finish', () => { file.close(); resolve() })
        }).on('error', reject)
      })

      await sock.sendMessage(jid, {
        audio: fs.readFileSync(tmpPath),
        mimetype: 'audio/mpeg',
        ptt: true
      })

      fs.unlinkSync(tmpPath)

    } catch (err) {
      console.error('[TTS ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}