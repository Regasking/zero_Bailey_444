import { config } from '../../config.js'

const timePhrases = [
  'L\'heure tourne. Ce que tu fais de ton temps, c\'est ton problème.',
  'Le temps passe. Moi je reste.',
  'Une seconde de plus que tu ne pourras jamais récupérer.',
  'Exactement l\'heure qu\'il est. Ni plus, ni moins. Étonnant non ?',
  'Le temps est précieux. Certains l\'oublient.',
]

export default {
  name: 'time',
  alias: ['date', 'heure'],
  desc: 'Heure et date actuelles',
  category: 'general',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const now = new Date()

    const heure = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
    const date = now.toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric',
      month: 'long', day: 'numeric'
    })
    const phrase = timePhrases[Math.floor(Math.random() * timePhrases.length)]

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  🕐  H E U R E\n╚══════════════════════╝\n\n🕐 *${heure}*\n📅 ${date.charAt(0).toUpperCase() + date.slice(1)}\n\n_"${phrase}"_\n\n— *${config.botName}*`
    })
  }
}