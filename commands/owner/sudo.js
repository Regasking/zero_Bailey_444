import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

export default {
  name: 'sudo',
  alias: ['admin'],
  desc: 'Gérer les admins bot',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    if (!isOwner) return

    if (!args[0]) {
      const ownerList = config.owners.map(o => `▸ ${o.name} (${o.role})`).join('\n')
      return sock.sendMessage(jid, {
        text: `👑 *Owners du bot*\n━━━━━━━━━━━━━━━━━━━━━\n${ownerList}\n━━━━━━━━━━━━━━━━━━━━━`
      })
    }

    await sock.sendMessage(jid, {
      text: personality.format('owner_cmd')
    })
  }
}