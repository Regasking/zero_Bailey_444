import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const PENDING_TTL  = 60 * 5   // confirmation expire en 5 minutes
const COOLDOWN_TTL = 60 * 10  // 10 minutes entre chaque broadcast
const AUDIT_TTL    = 60 * 60 * 24 * 30

// ─── Audit log ──────────────────────────────────────────────────
async function logBroadcast(senderJid, message, groupCount, success, failed) {
  try {
    await redis.set(`audit:broadcast:${Date.now()}`, JSON.stringify({
      sender: senderJid,
      message: message.slice(0, 300),
      groupCount,
      success,
      failed,
      date: new Date().toISOString()
    }), { ex: AUDIT_TTL })
  } catch {}
}

export default {
  name: 'broadcast',
  alias: ['bc'],
  desc: 'Envoyer un message à tous les groupes',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid
    if (!isOwner) return

    // Double vérification stricte
    const isHard = personality.isHardOwner(senderJid)
    if (!isHard) {
      return sock.sendMessage(jid, { text: `🚫 Accès refusé.\n\n— *${config.botName}*` })
    }

    // ── .broadcast confirm ────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'confirm') {
      const raw = await redis.get(`broadcast:pending:${senderJid}`)
      if (!raw) {
        return sock.sendMessage(jid, {
          text: `❌ Aucun broadcast en attente ou confirmation expirée (5 min).\n\nRelance avec ${config.prefix}broadcast <message>`
        })
      }

      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      await redis.del(`broadcast:pending:${senderJid}`)

      // Rate limit — 1 broadcast toutes les 10 minutes
      const lastBC = await redis.get(`broadcast:cooldown:${senderJid}`)
      if (lastBC) {
        return sock.sendMessage(jid, {
          text: `⏳ Attends encore un peu avant le prochain broadcast.\n\n— *${config.botName}*`
        })
      }

      const groups = await sock.groupFetchAllParticipating()
      const groupIds = Object.keys(groups)

      await sock.sendMessage(jid, {
        text: `📢 Envoi en cours à *${groupIds.length}* groupes...`
      })

      let success = 0
      let failed  = 0

      for (const groupId of groupIds) {
        try {
          await sock.sendMessage(groupId, {
            text: `📢 *Annonce officielle*\n\n${data.message}\n\n— *${config.botName}*`
          })
          success++
          await new Promise(r => setTimeout(r, 1200))
        } catch {
          failed++
        }
      }

      // Appliquer le cooldown
      await redis.set(`broadcast:cooldown:${senderJid}`, '1', { ex: COOLDOWN_TTL })

      // Log audit
      await logBroadcast(senderJid, data.message, groupIds.length, success, failed)

      return sock.sendMessage(jid, {
        text: `✅ *Broadcast terminé*\n\n▸ Succès : *${success}*\n▸ Échecs : *${failed}*\n▸ Total : *${groupIds.length}*\n\n— ${personality.format('owner_cmd')}`
      })
    }

    // ── .broadcast cancel ─────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'cancel') {
      await redis.del(`broadcast:pending:${senderJid}`)
      return sock.sendMessage(jid, { text: `🛑 Broadcast annulé.` })
    }

    // ── .broadcast logs ───────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'logs') {
      try {
        const keys = await redis.keys('audit:broadcast:*')
        if (!keys.length) return sock.sendMessage(jid, { text: `📋 Aucun broadcast enregistré.` })

        const recent = keys.sort().slice(-5).reverse()
        let text = `╔══════════════════════╗\n  📋  B R O A D C A S T  L O G S\n╚══════════════════════╝\n\n`

        for (const key of recent) {
          const entry = await redis.get(key)
          if (!entry) continue
          const e = typeof entry === 'string' ? JSON.parse(entry) : entry
          text += `📅 ${e.date?.slice(0, 10)}\n▸ *${e.success}/${e.groupCount}* groupes\n▸ "${e.message?.slice(0, 50)}..."\n\n`
        }

        return sock.sendMessage(jid, { text: text + `— *${config.botName}*` })
      } catch {
        return sock.sendMessage(jid, { text: `❌ Erreur récupération logs.` })
      }
    }

    // ── .broadcast <message> ──────────────────────────────────────
    if (!args.length) {
      return sock.sendMessage(jid, {
        text: `📢 *Utilisation :*\n▸ ${config.prefix}broadcast <message>\n▸ ${config.prefix}broadcast confirm\n▸ ${config.prefix}broadcast cancel\n▸ ${config.prefix}broadcast logs\n\n⚠️ La confirmation expire en *5 minutes*.\n⏳ Cooldown entre broadcasts : *10 minutes*`
      })
    }

    const message = args.join(' ')
    const groups  = await sock.groupFetchAllParticipating()
    const groupCount = Object.keys(groups).length

    // Sauvegarder dans Redis (survit au redémarrage)
    await redis.set(
      `broadcast:pending:${senderJid}`,
      JSON.stringify({ message }),
      { ex: PENDING_TTL }
    )

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  📢  C O N F I R M A T I O N\n╚══════════════════════╝\n\n*Message :*\n"${message}"\n\n*Destinataires :* ${groupCount} groupes\n⏱️ *Expire dans :* 5 minutes\n\n⚠️ Action irréversible.\n\n▸ *${config.prefix}broadcast confirm* — Envoyer\n▸ *${config.prefix}broadcast cancel* — Annuler\n\n— *${config.botName}*`
    })
  }
}