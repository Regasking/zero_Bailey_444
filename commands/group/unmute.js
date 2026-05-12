import { personality } from '../../utils/personality.js'

export default {
  name: 'unmute',
  alias: ['open', 'ouvrir'],
  desc: 'Ouvrir le groupe',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    try {
      await sock.groupSettingUpdate(jid, 'not_announcement')
      await sock.sendMessage(jid, {
        text: `🔊 Groupe ouvert. Tout le monde peut écrire.\n\n— ${personality.format('success')}`
      })
    } catch {
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}