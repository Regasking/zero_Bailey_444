import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

// Valeur en mémoire — initialisée depuis Redis au premier appel
let _botMode = null

export async function getBotMode() {
  if (_botMode) return _botMode
  try {
    const saved = await redis.get('bot:mode')
    _botMode = saved || (config.settings.publicMode ? 'public' : 'private')
  } catch {
    _botMode = config.settings.publicMode ? 'public' : 'private'
  }
  return _botMode
}

export async function setBotMode(mode) {
  _botMode = mode
  try {
    await redis.set('bot:mode', mode)
  } catch {}
}

export default {
  name: 'mode',
  alias: ['setmode'],
  desc: 'Changer le mode du bot',
  category: 'owner',
  ownerOnly: false,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid
    const currentMode = await getBotMode()
    const mode = args[0]?.toLowerCase()

    if (!mode || !['public', 'private', 'group'].includes(mode)) {
      return sock.sendMessage(jid, {
        text: `⚙️ *Mode actuel :* ${currentMode}\n\nUtilisation : ${config.prefix}mode public/private/group\n\n▸ *public* — Tout le monde\n▸ *private* — Owners seulement\n▸ *group* — Groupes seulement`
      }, { quoted: msg })
    }

    // Seul l'owner peut changer le mode
    if (!isOwner) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage')
      }, { quoted: msg })
    }

    await setBotMode(mode)

    await sock.sendMessage(jid, {
      text: `✅ Mode changé en *${mode}*\n\n— ${personality.format('owner_cmd')}`
    }, { quoted: msg })
  }
}