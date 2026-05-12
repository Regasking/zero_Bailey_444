import { personality } from '../../utils/personality.js'

export let maintenanceMode = false

export default {
  name: 'maintenance',
  alias: ['mode'],
  desc: 'Mode maintenance',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    if (!isOwner) return

    maintenanceMode = !maintenanceMode

    await sock.sendMessage(jid, {
      text: `🔧 Mode maintenance *${maintenanceMode ? 'activé ✅' : 'désactivé ❌'}*\n\n— ${personality.format('owner_cmd')}`
    })
  }
}