import { personality } from '../../utils/personality.js'

export default {
  name: 'ship',
  alias: ['compatibilite', 'love'],
  desc: 'Compatibilité entre 2 personnes',
  category: 'games',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (!mentions || mentions.length < 2) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .ship @personne1 @personne2'
      })
    }

    const p1 = mentions[0].split('@')[0]
    const p2 = mentions[1].split('@')[0]
    const score = Math.floor(Math.random() * 101)

    let emoji = '💔'
    let comment = 'Aucune chance.'
    if (score >= 80) { emoji = '❤️‍🔥'; comment = 'Parfaits ensemble.' }
    else if (score >= 60) { emoji = '💕'; comment = 'Bonne compatibilité.' }
    else if (score >= 40) { emoji = '💛'; comment = 'Peut mieux faire.' }
    else if (score >= 20) { emoji = '🤍'; comment = 'C\'est compliqué.' }

    await sock.sendMessage(jid, {
      text: `${emoji} *Ship*\n━━━━━━━━━━━━━━━━━━━━━\n@${p1} + @${p2}\n\n💘 Compatibilité : *${score}%*\n${comment}\n━━━━━━━━━━━━━━━━━━━━━`,
      mentions
    })
  }
}