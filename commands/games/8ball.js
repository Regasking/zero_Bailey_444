import { personality } from '../../utils/personality.js'

const responses = [
  'Oui, absolument.', 'Non.', 'Peut-être.', 'Certainement pas.',
  'Les signes pointent vers oui.', 'Très peu probable.',
  'Sans aucun doute.', 'Ma réponse est non.',
  'Concentre-toi et redemande.', 'C\'est certain.',
  'Pas dans cette vie.', 'Les perspectives sont bonnes.',
]

export default {
  name: '8ball',
  alias: ['boule', 'magic'],
  desc: 'Boule magique',
  category: 'games',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .8ball <question>'
      })
    }

    const response = responses[Math.floor(Math.random() * responses.length)]

    await sock.sendMessage(jid, {
      text: `🎱 *Boule Magique*\n━━━━━━━━━━━━━━━━━━━━━\n❓ ${args.join(' ')}\n\n🔮 ${response}\n━━━━━━━━━━━━━━━━━━━━━`
    })
  }
}