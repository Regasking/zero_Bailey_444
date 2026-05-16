import { personality } from '../../utils/personality.js'

export let maintenanceMode = false

export default {
  name: 'maintenance',
  alias: ['maint'],
  desc: 'Mode maintenance on/off',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    if (!isOwner) return

    maintenanceMode = !maintenanceMode

    await sock.sendMessage(jid, {
      text: `🔧 Mode maintenance *${maintenanceMode ? 'activé ✅' : 'désactivé ❌'}*\n\n${maintenanceMode
        ? 'Le bot ignore toutes les commandes sauf les owners.'
        : 'Le bot répond à tout le monde à nouveau.'}\n\n— ${personality.format('owner_cmd')}`
    })
  }
}