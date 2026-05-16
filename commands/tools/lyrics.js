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
        text: personality.format('error_usage') + '\n\nUtilisation : .lyrics <chanson>\nEx: .lyrics Bohemian Rhapsody Queen'
      })
    }

    const query = args.join(' ')

    try {
      await sock.sendMessage(jid, { text: '🔍 Recherche des paroles...' })

      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apis.mistral}`
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: `Tu es un assistant qui donne les paroles de chansons.

Règles STRICTES :
- Si tu connais avec CERTITUDE les paroles officielles de "${query}", donne-les avec ce format :
TITRE: [titre officiel]
ARTISTE: [nom artiste]
CONNU: OUI
PAROLES:
[paroles ici]

- Si tu n'es PAS CERTAIN ou si tu ne connais pas cette chanson, réponds UNIQUEMENT :
CONNU: NON

Ne jamais inventer ou approximer des paroles.`
          }]
        })
      })

      const data = await res.json()
      const content = data.choices[0].message.content.trim()

      // Vérifie si Mistral connaît la chanson
      if (content.includes('CONNU: NON') || !content.includes('CONNU: OUI')) {
        return sock.sendMessage(jid, {
          text: `❌ Paroles introuvables pour *"${query}"*.\n\nEssaie avec le titre exact + l'artiste.\nEx: \`.lyrics Shape of You Ed Sheeran\``
        })
      }

      const titreMatch = content.match(/TITRE:\s*(.+)/i)
      const artisteMatch = content.match(/ARTISTE:\s*(.+)/i)
      const parolesMatch = content.match(/PAROLES:\s*([\s\S]+)/i)

      const titre = titreMatch ? titreMatch[1].trim() : query
      const artiste = artisteMatch ? artisteMatch[1].trim() : 'Inconnu'
      const paroles = parolesMatch ? parolesMatch[1].replace('CONNU: OUI', '').trim() : ''

      if (!paroles) {
        return sock.sendMessage(jid, {
          text: `❌ Impossible d'extraire les paroles. Essaie avec un titre plus précis.`
        })
      }

      const maxLen = 3000
      const parolesFinales = paroles.length > maxLen
        ? paroles.slice(0, maxLen) + '\n\n_[... paroles tronquées]_'
        : paroles

      await sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  🎵  P A R O L E S\n╚══════════════════════╝\n\n🎵 *${titre}*\n👤 *${artiste}*\n\n${parolesFinales}\n\n— *${config.botName}* | ${personality.format('success')}`
      })

    } catch (err) {
      console.error('[LYRICS ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}