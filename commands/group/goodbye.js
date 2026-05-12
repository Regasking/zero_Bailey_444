import { groupSettings } from '../../handlers/eventHandler.js'
import { personality } from '../../utils/personality.js'

export default {
  name: 'goodbye',
  alias: ['aurevoir', 'bye'],
  desc: 'Activer/désactiver le message de sortie',
  category: 'group',
  adminOnly: true,
  groupOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    const settings = groupSettings.get(jid) || { welcome: false, goodbye: false }

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: `Goodbye actuel : *${settings.goodbye ? 'ON ✅' : 'OFF ❌'}*\n\nUtilisation : .goodbye on/off`
      })
    }

    settings.goodbye = args[0].toLowerCase() === 'on'
    groupSettings.set(jid, settings)

    await sock.sendMessage(jid, {
      text: `Goodbye *${settings.goodbye ? 'activé ✅' : 'désactivé ❌'}*\n\n— ${personality.format('success')}`
    })
  }
}