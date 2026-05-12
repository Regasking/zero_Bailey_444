import { personality } from '../../utils/personality.js'

export default {
  name: 'restart',
  alias: ['reboot'],
  desc: 'Redémarrer le bot',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    if (!isOwner) return

    await sock.sendMessage(jid, {
      text: `🔄 Redémarrage...\n\n— ${personality.format('owner_cmd')}`
    })

    setTimeout(() => process.exit(0), 2000)
  }
}