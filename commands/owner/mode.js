import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

export let botMode = 'public'

export default {
  name: 'mode',
  alias: ['setmode'],
  desc: 'Changer le mode du bot',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid
    
    // Accessible par le owner du bot (celui qui a configuré le .env)
    const senderNum = senderJid.split('@')[0]
    const isConfigOwner = config.owners.some(o => o.number.split('@')[0] === senderNum)

    if (!isConfigOwner) {
      return sock.sendMessage(jid, {
        text: '❌ Commande réservée aux owners.'
      }, { quoted: msg })
    }

    const mode = args[0]?.toLowerCase()
    if (!['public', 'private', 'group'].includes(mode)) {
      return sock.sendMessage(jid, {
        text: `⚙️ *Mode actuel :* ${botMode}\n\nUtilisation : .mode public/private/group\n\n▸ *public* — Tout le monde\n▸ *private* — Owners seulement\n▸ *group* — Groupes seulement`
      }, { quoted: msg })
    }

    botMode = mode
    await sock.sendMessage(jid, {
      text: `✅ Mode changé en *${mode}*\n\n— ${personality.format('owner_cmd')}`
    }, { quoted: msg })
  }
}