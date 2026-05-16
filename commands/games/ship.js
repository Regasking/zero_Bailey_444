import { config } from '../../config.js'

const comments = [
  { min: 90, max: 100, emoji: '❤️‍🔥', text: 'Parfaits ensemble. Même moi je dois l\'admettre.' },
  { min: 75, max: 89, emoji: '💕', text: 'Bonne compatibilité. Ça peut marcher si vous faites des efforts.' },
  { min: 60, max: 74, emoji: '💛', text: 'Pas mal. Mais peut mieux faire.' },
  { min: 40, max: 59, emoji: '🤍', text: 'C\'est compliqué. Comme la plupart des choses dans vos vies.' },
  { min: 20, max: 39, emoji: '❄️', text: 'Froid. Très froid. Continuez à vous ignorer.' },
  { min: 0, max: 19, emoji: '💔', text: 'Aucune chance. L\'univers a parlé. Acceptez-le.' },
]

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
        text: `❌ Mentionne 2 personnes.\n\nUtilisation : \`${config.prefix}ship @personne1 @personne2\``
      })
    }

    const p1 = mentions[0].split('@')[0]
    const p2 = mentions[1].split('@')[0]
    const score = Math.floor(Math.random() * 101)

    const result = comments.find(c => score >= c.min && score <= c.max)
    const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10))

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  ${result.emoji}  S H I P\n╚══════════════════════╝\n\n@${p1}\n     +\n@${p2}\n\n[${bar}] *${score}%*\n\n_"${result.text}"_\n\n— *${config.botName}* | _Mes calculs sont infaillibles._`,
      mentions
    })
  }
}