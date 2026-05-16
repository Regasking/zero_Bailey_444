import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

const fastPhrases = [
  'Trop rapide pour toi.',
  'Cligne des yeux. C\'est déjà fait.',
  'La vitesse, c\'est mon état naturel.',
]
const slowPhrases = [
  'Lent aujourd\'hui. Mais toujours là avant toi.',
  'Le réseau ralentit. Pas moi.',
  'Même lent, je réponds plus vite que la plupart.',
]

export default {
  name: 'ping',
  alias: ['p'],
  desc: 'Latence du bot',
  category: 'general',

  async execute(sock, msg) {
    const start = Date.now()
    const jid = msg.key.remoteJid

    const sent = await sock.sendMessage(jid, {
      text: '⏱️ ...'
    }, { quoted: msg })

    const latency = Date.now() - start
    const phrase = latency < 300
      ? fastPhrases[Math.floor(Math.random() * fastPhrases.length)]
      : slowPhrases[Math.floor(Math.random() * slowPhrases.length)]

    const bar = latency < 100 ? '🟢' : latency < 500 ? '🟡' : '🔴'

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  📡  P I N G\n╚══════════════════════╝\n\n${bar} *${latency}ms*\n\n_"${phrase}"_\n\n— *${config.botName}*`,
    }, { quoted: msg })
  }
}