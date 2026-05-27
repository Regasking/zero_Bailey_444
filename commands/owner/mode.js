import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const modeCache = new Map()

export async function getBotMode(sessionId = null) {
  const key = sessionId ? `mode:${sessionId}` : 'bot:mode'
  if (modeCache.has(key)) return modeCache.get(key)
  try {
    const saved = await redis.get(key)
    const mode = saved || 'public'
    modeCache.set(key, mode)
    return mode
  } catch {
    return 'public'
  }
}

export async function setBotMode(mode, sessionId = null) {
  const key = sessionId ? `mode:${sessionId}` : 'bot:mode'
  await redis.set(key, mode)
  modeCache.set(key, mode)
}

export default {
  name: 'mode',
  alias: ['setmode'],
  desc: 'Mettre ton bot en mode public / private / group',
  category: 'owner',
  ownerOnly: false, // ← CORRIGÉ : n'est pas réservé aux admins uniquement

  async execute(sock, msg, args, { isOwner, isSessionOwner, sessionId }) {
    const jid = msg.key.remoteJid
    const mode = args[0]?.toLowerCase()
    const validModes = ['public', 'private', 'group']

    // Afficher le mode actuel (accessible aux admins seulement vu ownerOnly: true)
    if (!mode || !validModes.includes(mode)) {
      const currentMode = await getBotMode(sessionId)
      return sock.sendMessage(jid, {
        text: `Mon mode actuel : *${currentMode}*.\n\nTu veux le changer ? Bien sûr que tu veux.\n\n▸ *${config.prefix}mode public* — Tout le monde a accès.\n▸ *${config.prefix}mode private* — Toi seul.\n▸ *${config.prefix}mode group* — Groupes uniquement.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    try {
      await setBotMode(mode, sessionId)
      const descriptions = {
        public:  `Mode *public* activé. J'accepte les masses. Pour l'instant.\n\n— *${config.botName}*`,
        private: `Mode *private*. Enfin. Je préfère travailler pour quelqu'un qui le mérite.\n\n— *${config.botName}*`,
        group:   `Mode *group*. Les DM c'est surfait de toute façon.\n\n— *${config.botName}*`
      }
      await sock.sendMessage(jid, { text: descriptions[mode] }, { quoted: msg })
    } catch {
      await sock.sendMessage(jid, {
        text: `Rare. Quelque chose a résisté. Ça n'arrivera plus.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }
  }
}