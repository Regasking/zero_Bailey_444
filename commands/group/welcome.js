import { groupSettings } from '../../handlers/eventHandler.js'
import { personality } from '../../utils/personality.js'

export default {
  name: 'welcome',
  alias: ['bienvenue'],
  desc: 'Activer/désactiver le message de bienvenue',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    const settings = groupSettings.get(jid) || { welcome: false, goodbye: false }

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: `Welcome actuel : *${settings.welcome ? 'ON ✅' : 'OFF ❌'}*\n\nUtilisation : .welcome on/off`
      })
    }

    settings.welcome = args[0].toLowerCase() === 'on'
    groupSettings.set(jid, settings)

    await sock.sendMessage(jid, {
      text: `Welcome *${settings.welcome ? 'activé ✅' : 'désactivé ❌'}*\n\n— ${personality.format('success')}`
    })
  }
}