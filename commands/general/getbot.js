import { config } from '../../config.js'

export default {
  name: 'getbot',
  alias: ['bot'],
  desc: 'Obtenir ce bot',
  category: 'general',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid

    await sock.sendMessage(jid, {
      text: `👑 *${config.botName}*
━━━━━━━━━━━━━━━━━━━━━
Tu veux ce bot ?

Rejoins notre chaîne de formation
Dev & Hacking Éthique 👇

📲 ${config.channelLink}
━━━━━━━━━━━━━━━━━━━━━
_Construit par les meilleurs. Ça se voit._`
    })
  }
}