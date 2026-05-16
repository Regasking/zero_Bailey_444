import { userXP, getXP } from './rank.js'
import { Redis } from '@upstash/redis'
import { config } from '../../config.js'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

export default {
  name: 'leaderboard',
  alias: ['top', 'classement'],
  desc: 'Classement XP du groupe',
  category: 'games',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid

    try {
      // Charge tous les XP depuis Redis
      const keys = await redis.keys('xp:*')
      if (!keys.length) {
        return sock.sendMessage(jid, {
          text: `📊 Aucun classement disponible.\n\nPersonne a encore rien fait ici. Classique.`
        })
      }

      const entries = []
      for (const key of keys) {
        const val = await redis.get(key)
        const userJid = key.replace('xp:', '')
        const xp = val ? parseInt(val) : 0
        userXP.set(userJid, xp)
        entries.push([userJid, xp])
      }

      const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 10)
      const medals = ['🥇', '🥈', '🥉']
      const getLevel = (xp) => Math.floor(xp / 100) + 1

      let text = `╔══════════════════════╗\n  🏆  C L A S S E M E N T\n╚══════════════════════╝\n\n`

      sorted.forEach(([userJid, xp], i) => {
        const medal = medals[i] || `${i + 1}.`
        const level = getLevel(xp)
        text += `${medal} @${userJid.split('@')[0]} — Nv.*${level}* (${xp} XP)\n`
      })

      text += `\n— *${config.botName}* | _Les faibles sont en bas._`

      await sock.sendMessage(jid, {
        text,
        mentions: sorted.map(([j]) => j)
      })
    } catch (err) {
      console.error('[LEADERBOARD ERROR]', err)
      await sock.sendMessage(jid, {
        text: `❌ Erreur lors du chargement du classement.`
      })
    }
  }
}