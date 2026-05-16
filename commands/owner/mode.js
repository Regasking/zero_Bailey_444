import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

export let botMode = config.settings.publicMode ? 'public' : 'private'

export default {
  name: 'mode',
  alias: ['setmode'],
  desc: 'Changer le mode du bot',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    // messageHandler gère déjà ownerOnly — on fait confiance à isOwner
    if (!isOwner) {
      return sock.sendMessage(jid, {
        text: 'Tu n\'as pas accès à cette commande.'
      }, { quoted: msg })
    }

    const mode = args[0]?.toLowerCase()

    if (!['public', 'private', 'group'].includes(mode)) {
      return sock.sendMessage(jid, {
        text: `⚙️ *Mode actuel :* ${botMode}\n\nUtilisation : ${config.prefix}mode public/private/group\n\n▸ *public* — Tout le monde\n▸ *private* — Owners seulement\n▸ *group* — Groupes seulement`
      }, { quoted: msg })
    }

    botMode = mode

    await sock.sendMessage(jid, {
      text: `✅ Mode changé en *${mode}*\n\n— ${personality.format('owner_cmd')}`
    }, { quoted: msg })
  }
}