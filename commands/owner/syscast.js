import { config } from '../../config.js'
import { sendSanction } from '../../utils/sanctionImage.js'
import { personality } from '../../utils/personality.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

// ═══════════ BLACKLIST ═══════════
export async function isBlacklisted(num) {
  try {
    const clean = num.replace(/\D/g, '')
    const val = await redis.get(`blacklist:${clean}`)
    return !!val
  } catch { return false }
}

async function addBlacklist(num, reason = 'Non spécifié') {
  const clean = num.replace(/\D/g, '')
  await redis.set(`blacklist:${clean}`, JSON.stringify({ reason, date: new Date().toISOString() }))
}

async function removeBlacklist(num) {
  const clean = num.replace(/\D/g, '')
  await redis.del(`blacklist:${clean}`)
}

async function getBlacklist() {
  const keys = await redis.keys('blacklist:*')
  const entries = []
  for (const key of keys) {
    const data = await redis.get(key)
    const num = key.replace('blacklist:', '')
    const info = typeof data === 'string' ? JSON.parse(data) : data
    entries.push({ num, ...info })
  }
  return entries
}

// ═══════════ SYSCAST ═══════════
// Publie un message dans Redis — tous les bots actifs le lisent et le transmettent à leur owner
export async function publishSyscast(message, type = 'info') {
  await redis.set('syscast:latest', JSON.stringify({
    message,
    type,
    date: new Date().toISOString(),
    from: 'admin'
  }), { ex: 60 * 60 * 24 }) // expire après 24h
}

export default {
  name: 'syscast',
  alias: ['sc', 'blacklist'],
  desc: 'Broadcast système + gestion blacklist (créateur uniquement)',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid
    if (!personality.isHardOwner(senderJid)) return

    const sub = args[0]?.toLowerCase()

    // ── .blacklist add/remove/list ─────────────────────────────
    if (sub === 'blacklist' || msg.body?.startsWith(config.prefix + 'blacklist')) {
      const action = args[1]?.toLowerCase() || args[0]?.toLowerCase()
      const num = args[2] || args[1]

      if (action === 'add' && num) {
        const reason = args.slice(3).join(' ') || 'Utilisation abusive'
        await addBlacklist(num, reason)
        await publishSyscast(`🚫 Utilisateur *${num}* banni.\nRaison : _${reason}_`, 'warning')
        return sendSanction(sock, jid, `🚫 *${num}* ajouté à la liste noire.\nRaison : _${reason}_\n\n_Tous les bots ont été notifiés._`, { quoted: msg })
      }

      if (action === 'remove' && num) {
        await removeBlacklist(num)
        return sock.sendMessage(jid, { text: `*${num}* libéré. Il a intérêt à se tenir.\n\n— *${config.botName}*` }, { quoted: msg })
      }

      if (action === 'list') {
        const list = await getBlacklist()
        if (!list.length) return sock.sendMessage(jid, { text: `Liste noire vide. Soit tout le monde se tient bien, soit t'as pas encore sévi.\n\n— *${config.botName}*` }, { quoted: msg })
        const text = list.map(e => `▸ *${e.num}* — ${e.reason} (${e.date?.slice(0, 10)})`).join('\n')
        return sock.sendMessage(jid, {
          text: `╔══════════════════════╗\n  🚫  L I S T E  N O I R E\n╚══════════════════════╝\n\n${text}\n\n— *${config.botName}*`
        }, { quoted: msg })
      }

      return sock.sendMessage(jid, {
        text: `*Utilisation :*\n▸ \`${config.prefix}blacklist add <num> [raison]\`\n▸ \`${config.prefix}blacklist remove <num>\`\n▸ \`${config.prefix}blacklist list\``
      }, { quoted: msg })
    }

    // ── .syscast <message> ────────────────────────────────────
    if (!args.length) {
      return sock.sendMessage(jid, {
        text: `Tu veux me parler à travers tous les bots à la fois ? Impressionnant comme ambition.\n\n▸ \`${config.prefix}syscast <message>\` — Tous les owners reçoivent\n▸ \`${config.prefix}syscast veille\` — Annonce de maintenance\n▸ \`${config.prefix}blacklist add/remove/list\` — Gérer les bannis\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    let message = args.join(' ')
    let type = 'info'

    // Raccourcis
    if (message === 'veille') {
      message = `⚠️ Le bot sera mis en maintenance dans quelques minutes. Merci de votre compréhension.`
      type = 'warning'
    }

    await publishSyscast(message, type)

    const icon = type === 'warning' ? '⚠️' : '📡'
    return sock.sendMessage(jid, {
      text: `${icon} *Message système envoyé à tous les owners.*\n\n"${message}"\n\n— *${config.botName}*`
    }, { quoted: msg })
  }
}