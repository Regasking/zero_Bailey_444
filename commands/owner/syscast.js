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
export async function publishSyscast(message, type = 'info') {
  await redis.set('syscast:latest', JSON.stringify({
    message, type,
    date: new Date().toISOString(),
    from: 'admin'
  }), { ex: 60 * 60 * 24 })
}

// ═══════════ COMMANDE BLACKLIST ═══════════
export const blacklistCommand = {
  name: 'blacklist',
  alias: ['bl'],
  desc: 'Gérer la liste noire',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, isSessionOwner, senderJid }) {
    const jid = msg.key.remoteJid

    // Accessible aux deux owners (hard + co-owner)
    if (!isOwner && !isSessionOwner) {
      return sock.sendMessage(jid, {
        text: `Tu peux pas me donner des ordres.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    const action = args[0]?.toLowerCase()
    const num    = args[1]
    const reason = args.slice(2).join(' ') || 'Utilisation abusive'

    if (action === 'add' && num) {
      await addBlacklist(num, reason)
      await publishSyscast(`🚫 Utilisateur *${num}* banni.\nRaison : _${reason}_`, 'warning')
      return sendSanction(sock, jid,
        `🚫 *${num}* ajouté à la liste noire.\nRaison : _${reason}_\n\n_Tous les bots ont été notifiés._`,
        { quoted: msg }
      )
    }

    if (action === 'remove' && num) {
      await removeBlacklist(num)
      return sock.sendMessage(jid, {
        text: `*${num}* libéré. Il a intérêt à se tenir.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'list') {
      const list = await getBlacklist()
      if (!list.length) return sock.sendMessage(jid, {
        text: `Liste noire vide. Soit tout le monde se tient bien, soit t'as pas encore sévi.\n\n— *${config.botName}*`
      }, { quoted: msg })
      const text = list.map(e => `▸ *${e.num}* — ${e.reason} (${e.date?.slice(0, 10)})`).join('\n')
      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  🚫  L I S T E  N O I R E\n╚══════════════════════╝\n\n${text}\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    // Usage
    return sock.sendMessage(jid, {
      text: `*Utilisation :*\n▸ \`${config.prefix}blacklist add <num> [raison]\`\n▸ \`${config.prefix}blacklist remove <num>\`\n▸ \`${config.prefix}blacklist list\`\n\n— *${config.botName}*`
    }, { quoted: msg })
  }
}

// ═══════════ COMMANDE SYSCAST ═══════════
export default {
  name: 'syscast',
  alias: ['sc'],
  desc: 'Broadcast système vers tous les owners',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid

    // Syscast : hard owner uniquement (toi)
    if (!personality.isHardOwner(senderJid)) {
      return sock.sendMessage(jid, {
        text: `Cette commande est réservée au créateur.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: `▸ \`${config.prefix}syscast <message>\` — Tous les owners reçoivent\n▸ \`${config.prefix}syscast veille\` — Annonce de maintenance\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    let message = args.join(' ')
    let type = 'info'

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