import { personality } from '../../utils/personality.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

// Cache local pour éviter trop de requêtes Redis
export const userXP = new Map()

export const addXP = async (jid, amount = 10) => {
  try {
    const current = userXP.get(jid) || 0
    const newXP = current + amount
    userXP.set(jid, newXP)
    await redis.set(`xp:${jid}`, newXP)
  } catch {}
}

export const getXP = async (jid) => {
  if (userXP.has(jid)) return userXP.get(jid)
  try {
    const val = await redis.get(`xp:${jid}`)
    const xp = val ? parseInt(val) : 0
    userXP.set(jid, xp)
    return xp
  } catch {
    return 0
  }
}

const getLevel = (xp) => Math.floor(xp / 100) + 1

export default {
  name: 'rank',
  alias: ['level', 'xp', 'niveau'],
  desc: 'Ton niveau XP',
  category: 'games',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid
    const xp = await getXP(senderJid)
    const level = getLevel(xp)
    const nextLevel = level * 100
    const progress = Math.floor((xp % 100) / 100 * 10)
    const bar = '█'.repeat(progress) + '░'.repeat(10 - progress)

    const titles = [
      'Inconnu', 'Rookie', 'Actif', 'Régulier',
      'Vétéran', 'Élite', 'Légende', 'Mythique'
    ]
    const title = titles[Math.min(level - 1, titles.length - 1)]

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  ⭐  R A N G\n╚══════════════════════╝\n\n👤 @${senderJid.split('@')[0]}\n🏆 *Niveau :* ${level} — _${title}_\n✨ *XP :* ${xp} / ${nextLevel}\n📊 [${bar}]\n\n_Utilise le bot. Grimpe. Ou reste en bas._`,
      mentions: [senderJid]
    })
  }
}