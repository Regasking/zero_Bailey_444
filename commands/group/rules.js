import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

export default {
  name: 'rules',
  alias: ['regles'],
  desc: 'Règles du groupe',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid

    // ─── .rules set <texte> ────────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'set') {
      if (!isOwner) {
        return sock.sendMessage(jid, {
          text: `Tu n'as pas accès à ça.`
        })
      }
      const rules = args.slice(1).join(' ')
      if (!rules) {
        return sock.sendMessage(jid, {
          text: `❌ Utilisation : ${config.prefix}rules set <règles>\n\nExemple : ${config.prefix}rules set 1. Respectez tout le monde\n2. Pas de spam`
        })
      }
      await redis.set(`rules:${jid}`, rules)
      return sock.sendMessage(jid, {
        text: `✅ Règles du groupe mises à jour.\n\n— ${personality.format('success')}`
      })
    }

    // ─── .rules clear ──────────────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'clear') {
      if (!isOwner) return
      await redis.del(`rules:${jid}`)
      return sock.sendMessage(jid, {
        text: `🗑️ Règles supprimées.\n\n— ${personality.format('success')}`
      })
    }

    // ─── Afficher les règles ───────────────────────────────────────────
    try {
      const rules = await redis.get(`rules:${jid}`)
      if (!rules) {
        return sock.sendMessage(jid, {
          text: `📋 Aucune règle définie dans ce groupe.\n\nAdmin : ${config.prefix}rules set <règles>`
        })
      }

      await sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  📋  R È G L E S\n╚══════════════════════╝\n\n${rules}\n\n— *${config.botName}* | _Respecte ou pars._`
      })
    } catch (err) {
      console.error('[RULES ERROR]', err)
    }
  }
}