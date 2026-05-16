import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const SETTINGS_TTL = 60 * 60 * 24 * 365 // 1 an
const WARN_TTL     = 60 * 60 * 24 * 30  // 30 jours
const FLOOD_TTL    = 10                  // 10 secondes

// ═══════════════════════════════════════════════════════════════
// REDIS HELPERS — Paramètres de protection par groupe
// ═══════════════════════════════════════════════════════════════

async function getGroupSettings(groupJid) {
  try {
    const data = await redis.get(`antigroup:${groupJid}`)
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : {}
  } catch {
    return {}
  }
}

async function saveGroupSettings(groupJid, settings) {
  try {
    await redis.set(`antigroup:${groupJid}`, JSON.stringify(settings), { ex: SETTINGS_TTL })
  } catch {}
}

// ─── Warns (partagés avec warn.js via Redis) ─────────────────
async function getWarns(groupJid, userJid) {
  try {
    const data = await redis.get(`warn:${groupJid}:${userJid}`)
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : { count: 0 }
  } catch {
    return { count: 0 }
  }
}

async function addWarn(groupJid, userJid, reason) {
  const data = await getWarns(groupJid, userJid)
  data.count++
  if (!data.reasons) data.reasons = []
  data.reasons.push({ reason, date: new Date().toLocaleDateString('fr-FR') })
  try {
    await redis.set(`warn:${groupJid}:${userJid}`, JSON.stringify(data), { ex: WARN_TTL })
  } catch {}
  return data.count
}

async function resetWarns(groupJid, userJid) {
  try { await redis.del(`warn:${groupJid}:${userJid}`) } catch {}
}

// ─── Limite de warns (partagée avec warn.js) ─────────────────
const warnLimits = new Map()
function getWarnLimit(jid) { return warnLimits.get(jid) || 3 }

// ─── Flood tracker (en mémoire, volontaire) ──────────────────
const floodTracker = new Map() // jid → { userJid → { count, first } }

// ─── BadWords par groupe ──────────────────────────────────────
async function getBadWords(groupJid) {
  try {
    const data = await redis.get(`badwords:${groupJid}`)
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : []
  } catch {
    return []
  }
}

async function saveBadWords(groupJid, words) {
  try {
    await redis.set(`badwords:${groupJid}`, JSON.stringify(words), { ex: SETTINGS_TTL })
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// HELPER — Warn + kick auto si limite atteinte
// ═══════════════════════════════════════════════════════════════

// FIX 5 — Vérification bot admin avant toute action de modération
async function isBotAdmin(sock, groupJid) {
  try {
    const meta   = await sock.groupMetadata(groupJid)
    const botJid = sock.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net'
    return meta.participants.some(
      p => (p.id === botJid || p.jid === botJid) &&
           (p.admin === 'admin' || p.admin === 'superadmin')
    )
  } catch {
    return false
  }
}

async function warnUser(sock, groupJid, userJid, reason) {
  // Ne rien faire si le bot n'est pas admin
  const botIsAdmin = await isBotAdmin(sock, groupJid)
  if (!botIsAdmin) {
    await sock.sendMessage(groupJid, {
      text: `⚠️ Je ne peux pas modérer — je ne suis pas administrateur de ce groupe.

Fais-moi admin pour activer les protections.

— *${config.botName}*`
    }).catch(() => {})
    return
  }

  const count = await addWarn(groupJid, userJid, reason)
  const limit = getWarnLimit(groupJid)
  const num   = userJid.split('@')[0]

  if (count >= limit) {
    await resetWarns(groupJid, userJid)
    try { await sock.groupParticipantsUpdate(groupJid, [userJid], 'remove') } catch {}
    await sock.sendMessage(groupJid, {
      text: `⛔ @${num} — *${count}/${limit} avertissements*\n\n📋 *Raison :* ${reason}\n\n🚪 Limite atteinte. Expulsion automatique.\n\n— *${config.botName}*`,
      mentions: [userJid]
    })
  } else {
    const remaining = limit - count
    const bar = '█'.repeat(count) + '░'.repeat(limit - count)
    await sock.sendMessage(groupJid, {
      text: `⚠️ @${num} — Warn *${count}/${limit}*\n\n📋 *Raison :* ${reason}\n[${bar}]\n\n${remaining === 1 ? '⚡ *Dernier avertissement avant expulsion.*' : `Encore *${remaining}* avant l'expulsion.`}\n\n— *${config.botName}*`,
      mentions: [userJid]
    })
  }
}

// ═══════════════════════════════════════════════════════════════
// ÉVÉNEMENTS — Appelé depuis eventHandler.js
// ═══════════════════════════════════════════════════════════════

export async function handleGroupUpdate(sock, update) {
  try {
    const { id: groupJid, participants, action, author } = update
    if (!groupJid || !participants || !action) return

    const settings = await getGroupSettings(groupJid)
    const botJid   = sock.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net'

    // Ignorer les actions du bot lui-même et des owners
    if (!author || author === botJid || personality.isOwner(author)) return

    // ── Anti-Promote ─────────────────────────────────────────
    if (action === 'promote' && settings.antiPromote) {
      // Rétrograder les promus
      try { await sock.groupParticipantsUpdate(groupJid, participants, 'demote') } catch {}
      await warnUser(sock, groupJid, author, 'Promotion non autorisée (antiPromote actif)')
    }

    // ── Anti-Demote ──────────────────────────────────────────
    if (action === 'demote' && settings.antiDemote) {
      // Remettre les rétrogradés admin
      try { await sock.groupParticipantsUpdate(groupJid, participants, 'promote') } catch {}
      await warnUser(sock, groupJid, author, 'Rétrogradation non autorisée (antiDemote actif)')
    }

    // ── Anti-Bot ─────────────────────────────────────────────
    if (action === 'add' && settings.antiBot) {
      for (const p of participants) {
        // Heuristique bot : LID ou numéro connu
        const isBot = p.endsWith('@lid') || p.includes('bot')
        if (isBot) {
          try { await sock.groupParticipantsUpdate(groupJid, [p], 'remove') } catch {}
          await warnUser(sock, groupJid, author, 'Ajout de bot non autorisé (antiBot actif)')
        }
      }
    }

  } catch (err) {
    console.error('[ANTIGROUP GROUP UPDATE ERROR]', err)
  }
}

export async function handleMessageProtection(sock, msg) {
  try {
    const jid = msg.key.remoteJid
    if (!jid?.endsWith('@g.us')) return

    const senderJid = msg.key.participant || msg.key.remoteJid
    const botJid    = sock.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net'

    if (senderJid === botJid || personality.isOwner(senderJid)) return

    const settings = await getGroupSettings(jid)

    const body = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.imageMessage?.caption
      || msg.message?.videoMessage?.caption
      || ''

    // ── Anti-Link ────────────────────────────────────────────
    if (settings.antiLink) {
      const linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com|t\.me\/|bit\.ly)[^\s]*/i
      if (linkRegex.test(body)) {
        try { await sock.sendMessage(jid, { delete: msg.key }) } catch {}
        await warnUser(sock, jid, senderJid, 'Envoi de lien non autorisé (antiLink actif)')
        return
      }
    }

    // ── Anti-BadWord ─────────────────────────────────────────
    if (settings.antiBadWord) {
      const badWords = await getBadWords(jid)
      const lowerBody = body.toLowerCase()
      const found = badWords.find(w => lowerBody.includes(w.toLowerCase()))
      if (found) {
        try { await sock.sendMessage(jid, { delete: msg.key }) } catch {}
        await warnUser(sock, jid, senderJid, `Mot interdit détecté (antiBadWord actif)`)
        return
      }
    }

    // ── Anti-Flood ───────────────────────────────────────────
    if (settings.antiFlood) {
      const threshold = settings.floodLimit || 5 // messages max en 10s
      const now = Date.now()

      if (!floodTracker.has(jid)) floodTracker.set(jid, new Map())
      const groupTracker = floodTracker.get(jid)

      const userTrack = groupTracker.get(senderJid) || { count: 0, first: now }

      if (now - userTrack.first > FLOOD_TTL * 1000) {
        // Reset si fenêtre expirée
        groupTracker.set(senderJid, { count: 1, first: now })
      } else {
        userTrack.count++
        groupTracker.set(senderJid, userTrack)

        if (userTrack.count >= threshold) {
          groupTracker.set(senderJid, { count: 0, first: now })
          await warnUser(sock, jid, senderJid, `Flood détecté — ${userTrack.count} messages en ${FLOOD_TTL}s`)
          return
        }
      }
    }

    // ── Anti-Delete ──────────────────────────────────────────
    // (géré séparément via handleDeleteProtection)

  } catch (err) {
    console.error('[ANTIGROUP MESSAGE PROTECTION ERROR]', err)
  }
}

// Cache pour anti-delete
export const messageCache = new Map() // jid → [{ key, body, sender, timestamp }]
const CACHE_SIZE = 50

export function cacheMessage(msg) {
  const jid = msg.key.remoteJid
  if (!jid?.endsWith('@g.us')) return

  const body = msg.message?.conversation
    || msg.message?.extendedTextMessage?.text
    || msg.message?.imageMessage?.caption
    || ''

  if (!body) return

  if (!messageCache.has(jid)) messageCache.set(jid, [])
  const cache = messageCache.get(jid)
  cache.push({
    key: msg.key,
    body,
    sender: msg.key.participant || msg.key.remoteJid,
    timestamp: Date.now()
  })
  if (cache.length > CACHE_SIZE) cache.shift()
}

export async function handleDeleteProtection(sock, msg) {
  try {
    const jid = msg.key.remoteJid
    if (!jid?.endsWith('@g.us')) return

    const settings = await getGroupSettings(jid)
    if (!settings.antiDelete) return

    const deletedKey = msg.message?.protocolMessage?.key
    if (!deletedKey) return

    const cache = messageCache.get(jid) || []
    const found = cache.find(m => m.key.id === deletedKey.id)
    if (!found) return

    const num = found.sender?.split('@')[0]

    await sock.sendMessage(jid, {
      text: `🗑️ *Message supprimé détecté*\n\n👤 @${num}\n💬 *Contenu :* ${found.body}\n\n— *${config.botName}*`,
      mentions: [found.sender]
    })

  } catch (err) {
    console.error('[ANTIDELETE ERROR]', err)
  }
}

// ═══════════════════════════════════════════════════════════════
// COMMANDE — .antigroup
// ═══════════════════════════════════════════════════════════════

const FEATURES = {
  antilink:    { key: 'antiLink',    label: 'Anti-Lien' },
  antipromote: { key: 'antiPromote', label: 'Anti-Promote' },
  antidemote:  { key: 'antiDemote',  label: 'Anti-Demote' },
  antibot:     { key: 'antiBot',     label: 'Anti-Bot' },
  antidelete:  { key: 'antiDelete',  label: 'Anti-Suppression' },
  antibadword: { key: 'antiBadWord', label: 'Anti-Gros Mots' },
  antiflood:   { key: 'antiFlood',   label: 'Anti-Flood' },
}

export default {
  name: 'antigroup',
  alias: ['anti', 'protection'],
  desc: 'Gestion de toutes les protections du groupe',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: `👥 Cette commande fonctionne uniquement en groupe.` })
    }

    // Vérifier admin
    const meta = await sock.groupMetadata(jid).catch(() => null)
    if (!meta) return sock.sendMessage(jid, { text: `❌ Impossible de récupérer les infos du groupe.` })

    const senderIsAdmin = meta.participants.some(
      p => (p.id === senderJid || p.jid === senderJid) &&
           (p.admin === 'admin' || p.admin === 'superadmin')
    )
    if (!isOwner && !senderIsAdmin) {
      return sock.sendMessage(jid, { text: `🚫 Admins seulement.` })
    }

    const settings = await getGroupSettings(jid)
    const sub = args[0]?.toLowerCase()

    // ── .antigroup status ────────────────────────────────────
    if (!sub || sub === 'status') {
      const lines = Object.entries(FEATURES).map(([, { key, label }]) => {
        const on = settings[key]
        return `${on ? '✅' : '❌'} *${label}*`
      })

      const floodLimit = settings.floodLimit || 5

      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  🛡️  P R O T E C T I O N S\n╚══════════════════════╝\n\n${lines.join('\n')}\n\n⚡ *Flood limit :* ${floodLimit} msg/10s\n\n━━━━━━━━━━━━━━━━━━━━━\n*Commandes :*\n▸ ${config.prefix}antigroup <feature> on/off\n▸ ${config.prefix}antigroup flood <nombre>\n▸ ${config.prefix}antigroup badword add <mot>\n▸ ${config.prefix}antigroup badword remove <mot>\n▸ ${config.prefix}antigroup badword list\n\n*Features :* ${Object.keys(FEATURES).join(', ')}\n\n— *${config.botName}*`
      })
    }

    // ── .antigroup flood <nombre> ────────────────────────────
    if (sub === 'flood' && args[1]) {
      const n = parseInt(args[1])
      if (isNaN(n) || n < 2 || n > 50) {
        return sock.sendMessage(jid, { text: `❌ Nombre invalide. Entre 2 et 50.` })
      }
      settings.floodLimit = n
      await saveGroupSettings(jid, settings)
      return sock.sendMessage(jid, {
        text: `✅ Limite flood fixée à *${n} messages / 10 secondes*.\n\n— *${config.botName}*`
      })
    }

    // ── .antigroup badword add/remove/list ───────────────────
    if (sub === 'badword') {
      const action = args[1]?.toLowerCase()
      const word   = args.slice(2).join(' ').toLowerCase()
      const words  = await getBadWords(jid)

      if (action === 'list') {
        if (!words.length) {
          return sock.sendMessage(jid, { text: `📋 Aucun mot interdit configuré.` })
        }
        return sock.sendMessage(jid, {
          text: `╔══════════════════════╗\n  🤬  M O T S  I N T E R D I T S\n╚══════════════════════╝\n\n${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\n— *${config.botName}*`
        })
      }

      if (action === 'add') {
        if (!word) return sock.sendMessage(jid, { text: `❌ Précise un mot.` })
        if (words.includes(word)) return sock.sendMessage(jid, { text: `⚠️ Ce mot est déjà dans la liste.` })
        words.push(word)
        await saveBadWords(jid, words)
        return sock.sendMessage(jid, { text: `✅ *"${word}"* ajouté à la liste.\n\n— *${config.botName}*` })
      }

      if (action === 'remove') {
        if (!word) return sock.sendMessage(jid, { text: `❌ Précise un mot.` })
        const idx = words.indexOf(word)
        if (idx === -1) return sock.sendMessage(jid, { text: `⚠️ Ce mot n'est pas dans la liste.` })
        words.splice(idx, 1)
        await saveBadWords(jid, words)
        return sock.sendMessage(jid, { text: `✅ *"${word}"* retiré de la liste.\n\n— *${config.botName}*` })
      }

      return sock.sendMessage(jid, {
        text: `*Utilisation :*\n▸ ${config.prefix}antigroup badword add <mot>\n▸ ${config.prefix}antigroup badword remove <mot>\n▸ ${config.prefix}antigroup badword list`
      })
    }

    // ── .antigroup <feature> on/off ──────────────────────────
    const feature = FEATURES[sub]
    const toggle  = args[1]?.toLowerCase()

    if (!feature) {
      return sock.sendMessage(jid, {
        text: `❌ Feature inconnue.\n\n*Disponibles :* ${Object.keys(FEATURES).join(', ')}`
      })
    }

    if (toggle !== 'on' && toggle !== 'off') {
      return sock.sendMessage(jid, {
        text: `❌ Précise *on* ou *off*.\n\n*Exemple :* ${config.prefix}antigroup ${sub} on`
      })
    }

    settings[feature.key] = toggle === 'on'
    await saveGroupSettings(jid, settings)

    await sock.sendMessage(jid, {
      text: `${toggle === 'on' ? '✅' : '❌'} *${feature.label}* — ${toggle === 'on' ? 'Activé' : 'Désactivé'}\n\n— *${config.botName}*`
    })
  }
}