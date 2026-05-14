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
      await sock.sendMessage(jid, { text: '🔍 Recherche des paroles...' })

      // Utilise Mistral pour obtenir les paroles directement
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
            content: `Donne-moi les paroles complètes de la chanson "${query}". 
Réponds avec ce format exact :
TITRE: [titre officiel]
ARTISTE: [nom artiste]
PAROLES:
[paroles ici]

Si tu ne connais pas cette chanson, réponds uniquement: INTROUVABLE`
          }]
        })
      })

      const data = await res.json()
      const content = data.choices[0].message.content.trim()

      if (content === 'INTROUVABLE' || content.includes('INTROUVABLE')) {
        return sock.sendMessage(jid, {
          text: '❌ Paroles introuvables. Essaie avec le nom de l\'artiste ou en anglais.'
        })
      }

      // Parser la réponse
      const titreMatch = content.match(/TITRE:\s*(.+)/i)
      const artisteMatch = content.match(/ARTISTE:\s*(.+)/i)
      const parolesMatch = content.match(/PAROLES:\s*([\s\S]+)/i)

      const titre = titreMatch ? titreMatch[1].trim() : query
      const artiste = artisteMatch ? artisteMatch[1].trim() : 'Inconnu'
      const paroles = parolesMatch ? parolesMatch[1].trim() : content

      // WhatsApp limite à ~65000 chars, on tronque si besoin
      const maxLen = 3000
      const parolesFinales = paroles.length > maxLen
        ? paroles.slice(0, maxLen) + '\n\n[... suite trop longue]'
        : paroles

      await sock.sendMessage(jid, {
        text: `🎵 *${titre}*\n👤 *${artiste}*\n━━━━━━━━━━━━━━━━━━\n\n${parolesFinales}\n\n━━━━━━━━━━━━━━━━━━\n${personality.format('success')}${personality.maybeFlexCreator()}`
      })

    } catch (err) {
      console.error('[LYRICS ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}