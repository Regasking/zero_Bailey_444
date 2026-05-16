import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const WARN_TTL = 60 * 60 * 24 * 30 // 30 jours

// Limite personnalisable par groupe (en mémoire — reset au reboot, volontaire)
const warnLimits = new Map()

function getLimit(jid) {
  return warnLimits.get(jid) || 3
}

// ─── Helpers Redis ──────────────────────────────────────────────────────────
async function getWarns(groupJid, userJid) {
  try {
    const data = await redis.get(`warn:${groupJid}:${userJid}`)
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : { count: 0 }
  } catch {
    return { count: 0 }
  }
}

async function setWarns(groupJid, userJid, data) {
  try {
    await redis.set(`warn:${groupJid}:${userJid}`, JSON.stringify(data), { ex: WARN_TTL })
  } catch {}
}

async function deleteWarns(groupJid, userJid) {
  try { await redis.del(`warn:${groupJid}:${userJid}`) } catch {}
}

async function listWarns(groupJid) {
  try {
    const keys = await redis.keys(`warn:${groupJid}:*`)
    const results = []
    for (const key of keys) {
      const userJid = key.replace(`warn:${groupJid}:`, '')
      const data = await redis.get(key)
      if (!data) continue
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      results.push([userJid, parsed.count])
    }
    return results
  } catch {
    return []
  }
}

// ─── Commande ───────────────────────────────────────────────────────────────
export default {
  name: 'warn',
  alias: ['avertir', 'w'],
  desc: 'Avertir un membre — expulsion automatique à la limite',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, {
        text: `👥 Cette commande fonctionne uniquement en groupe.`
      })
    }

    // Vérifier que l'expéditeur est admin ou owner du bot
    const meta = await sock.groupMetadata(jid).catch(() => null)
    if (!meta) {
      return sock.sendMessage(jid, { text: `❌ Impossible de récupérer les infos du groupe.` })
    }

    const senderIsAdmin = meta.participants.some(
      p => (p.id === senderJid || p.jid === senderJid) &&
           (p.admin === 'admin' || p.admin === 'superadmin')
    )

    if (!isOwner && !senderIsAdmin) {
      return sock.sendMessage(jid, { text: `🚫 Admins seulement.` })
    }

    const target = msg.message?.extendedTextMessage?.contextInfo?.participant
      || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    // ─── .warn set <nombre> ─────────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'set') {
      const newLimit = parseInt(args[1])
      if (isNaN(newLimit) || newLimit < 1 || newLimit > 20) {
        return sock.sendMessage(jid, {
          text: `❌ Nombre invalide.\n\nUtilisation : ${config.prefix}warn set <1-20>`
        })
      }
      warnLimits.set(jid, newLimit)
      return sock.sendMessage(jid, {
        text: `⚙️ Limite fixée à *${newLimit}* avertissements.\n${newLimit} warns = expulsion automatique.\n\n— ${personality.format('success')}`
      })
    }

    // ─── .warn reset @mention ───────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'reset') {
      if (!target) {
        return sock.sendMessage(jid, {
          text: `❌ Mentionne ou reply un membre.\nUtilisation : ${config.prefix}warn reset @membre`
        })
      }
      await deleteWarns(jid, target)
      return sock.sendMessage(jid, {
        text: `🔄 Avertissements de @${target.split('@')[0]} remis à zéro.\n\n— ${personality.format('success')}`,
        mentions: [target]
      })
    }

    // ─── .warn list ─────────────────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'list') {
      const limit = getLimit(jid)
      const entries = await listWarns(jid)

      if (!entries.length) {
        return sock.sendMessage(jid, {
          text: `📋 Aucun avertissement dans ce groupe.\n\nParfait. Pour l'instant.`
        })
      }

      const lines = entries.map(([u, c]) => `▸ @${u.split('@')[0]} — *${c}/${limit}*`)
      const mentions = entries.map(([u]) => u)

      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  ⚠️  A V E R T I S S E M E N T S\n╚══════════════════════╝\n\n${lines.join('\n')}\n\n*Limite :* ${limit} warns = expulsion\n\n— *${config.botName}*`,
        mentions
      })
    }

    // ─── .warn @mention — avertir ───────────────────────────────────────
    if (!target) {
      const limit = getLimit(jid)
      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  ⚠️  W A R N  S Y S T E M\n╚══════════════════════╝\n\n▸ ${config.prefix}warn @membre — Avertir\n▸ ${config.prefix}warn set <1-20> — Fixer la limite\n▸ ${config.prefix}warn reset @membre — Reset warns\n▸ ${config.prefix}warn list — Voir tous les warns\n\n*Limite actuelle :* ${limit} avertissements\n\n— *${config.botName}*`
      })
    }

    const limit = getLimit(jid)
    const warnData = await getWarns(jid, target)
    warnData.count++
    await setWarns(jid, target, warnData)

    const count = warnData.count
    const num = target.split('@')[0]

    // ─── Expulsion ──────────────────────────────────────────────────────
    if (count >= limit) {
      await deleteWarns(jid, target)
      try { await sock.groupParticipantsUpdate(jid, [target], 'remove') } catch {}
      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  ⛔  E X P U L S I O N\n╚══════════════════════╝\n\n@${num} vient de recevoir son *${count}ème avertissement*.\n\nLa limite était *${limit}*. Elle a été atteinte.\nConséquences assumées.\n\n— *${config.botName}* | _${personality.format('success')}_`,
        mentions: [target]
      })
    }

    // ─── Avertissement normal ───────────────────────────────────────────
    const remaining = limit - count
    const bar = '█'.repeat(count) + '░'.repeat(limit - count)

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  ⚠️  A V E R T I S S E M E N T\n╚══════════════════════╝\n\n@${num} — Warn *${count}/${limit}*\n\n[${bar}]\n\n${remaining === 1
        ? `⚡ *Dernier avertissement.* Le prochain = expulsion.`
        : `Encore *${remaining}* avant l'expulsion.`}\n\n— *${config.botName}*`,
      mentions: [target]
    })
  }
}
