import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

export default {
  name: 'lyrics',
  alias: ['paroles'],
  desc: 'Paroles d\'une chanson',
  category: 'tools',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .lyrics <chanson>'
      })
    }

    const query = args.join(' ')

    try {
      await sock.sendMessage(jid, { text: personality.format('loading') })

      const searchRes = await fetch(
        `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${config.apis.genius}` } }
      )
      const searchData = await searchRes.json()
      const hit = searchData.response.hits[0]

      if (!hit) {
        return sock.sendMessage(jid, {
          text: 'Chanson introuvable. Essaie avec le nom de l\'artiste.'
        })
      }

      const song = hit.result
      await sock.sendMessage(jid, {
        text: `🎵 *${song.title}*\n👤 *${song.primary_artist.name}*\n\n🔗 Paroles complètes :\n${song.url}\n\n— ${personality.format('success')}${personality.maybeFlexCreator()}`
      })

    } catch (err) {
      console.error('[LYRICS ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}