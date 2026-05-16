import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

export default {
  name: 'sudo',
  alias: ['owners', 'ownerlist'],
  desc: 'Gérer les admins bot',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    if (!isOwner) return

    const ownerList = config.owners.map(o =>
      `▸ *${o.name}*\n  Role : ${o.role}\n  Numéro : ${o.number.split('@')[0]}`
    ).join('\n\n')

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  👑  O W N E R S\n╚══════════════════════╝\n\n${ownerList}\n\n— *${config.botName}* | _Au sommet. Comme toujours._`
    })
  }
}