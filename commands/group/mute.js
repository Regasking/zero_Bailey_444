import { personality } from '../../utils/personality.js'

export default {
  name: 'mute',
  alias: ['close', 'fermer'],
  desc: 'Fermer le groupe',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    try {
      await sock.groupSettingUpdate(jid, 'announcement')
      await sock.sendMessage(jid, {
        text: `🔇 Groupe fermé. Seuls les admins peuvent écrire.\n\n— ${personality.format('success')}`
      })
    } catch {
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}