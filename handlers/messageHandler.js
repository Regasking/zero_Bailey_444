import { personality } from '../utils/personality.js'
import { t, getUserLang, setUserLang } from '../utils/i18n.js'
import { config } from '../config.js'
import { Redis } from '@upstash/redis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

export let globalStore = null
export function setStore(store) { globalStore = store }

// ═══════════════════════════════════════════════════════════════
// AUTO-LOADER
// ═══════════════════════════════════════════════════════════════
const commands = new Map()

export async function loadCommands() {
  const categories = ['general', 'group', 'media', 'games', 'tools', 'owner', 'ai']

  for (const category of categories) {
    const dir = path.join(__dirname, `../commands/${category}`)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'))

    for (const file of files) {
      // Sanitize nom de fichier — évite path traversal
      if (!/^[\w\-]+\.js$/.test(file)) {
        console.warn(`[SECURITY] Fichier ignoré (nom suspect) : ${file}`)
        continue
      }
      try {
        const cmd = await import(`../commands/${category}/${file}`)
        const command = cmd.default
        if (!command?.name || typeof command.execute !== 'function') continue
        commands.set(command.name, command)
        if (command.alias) command.alias.forEach(a => commands.set(a, command))
      } catch (err) {
        console.error(`[LOAD ERROR] ${category}/${file}:`, err.message)
      }
    }
  }
  console.log(`✅ ${commands.size} commandes chargées`)
}

// ═══════════════════════════════════════════════════════════════
// FIX 1 — COOLDOWN PAR SENDER RÉEL (pas remoteJid)
// FIX 2 — RATE LIMIT PAR COMMANDE
// ═══════════════════════════════════════════════════════════════
const cooldowns    = new Map()
const cmdCooldowns = new Map()

const CMD_LIMITS = {
  ai: 10, song: 15, csong: 15, tts: 5,
  translate: 5, ocr: 10, sticker: 5, qr: 5, weather: 5,
}

function isOnCooldown(senderJid) {
  const now  = Date.now()
  const last = cooldowns.get(senderJid) || 0
  if (now - last < config.settings.cooldown * 1000) return true
  cooldowns.set(senderJid, now)
  return false
}

function isOnCmdCooldown(senderJid, cmdName) {
  const limit = CMD_LIMITS[cmdName]
  if (!limit) return false
  const key  = `${senderJid}:${cmdName}`
  const now  = Date.now()
  const last = cmdCooldowns.get(key) || 0
  if (now - last < limit * 1000) return true
  cmdCooldowns.set(key, now)
  return false
}

// ═══════════════════════════════════════════════════════════════
// FIX 3 — STORE BORNÉ (max 500 entrées)
// ═══════════════════════════════════════════════════════════════
const MAX_STORE_SIZE = 500

export function addToStore(store, key, value) {
  if (store.size >= MAX_STORE_SIZE) {
    const firstKey = store.keys().next().value
    store.delete(firstKey)
  }
  store.set(key, value)
}

// ═══════════════════════════════════════════════════════════════
// FIX 4 — AUDIT LOG COMMANDES OWNER
// ═══════════════════════════════════════════════════════════════
const OWNER_CMDS = new Set(['eval', 'exec', 'run', 'broadcast', 'bc', 'restart', 'maintenance', 'mode', 'sudo'])
const AUDIT_TTL  = 60 * 60 * 24 * 30

async function auditLog(senderJid, cmdName, args) {
  try {
    await redis.set(
      `audit:cmd:${Date.now()}`,
      JSON.stringify({
        sender: senderJid,
        cmd: cmdName,
        args: args.join(' ').slice(0, 200),
        date: new Date().toISOString()
      }),
      { ex: AUDIT_TTL }
    )
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// REACT EMOJIS
// ═══════════════════════════════════════════════════════════════
const categoryEmojis = {
  general: ['⚡', '✨', '💫'],
  group:   ['👥', '⚙️', '🔧'],
  media:   ['🎵', '🎬', '📥'],
  games:   ['🎮', '🎯', '🃏'],
  tools:   ['🛠️', '🔍', '⚙️'],
  owner:   ['👑', '⚡', '🔑'],
  ai:      ['🤖', '💡', '🧠'],
  default: ['⚡', '✅', '💯'],
}

async function reactToMessage(sock, msg, category = 'default') {
  try {
    const emojis = categoryEmojis[category] || categoryEmojis.default
    const emoji  = emojis[Math.floor(Math.random() * emojis.length)]
    await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } })
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// HANDLE MESSAGE
// ═══════════════════════════════════════════════════════════════
export async function handleMessage(sock, msg) {
  try {
    const body = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.imageMessage?.caption
      || msg.message?.videoMessage?.caption
      || ''

    const jid       = msg.key.remoteJid
    // FIX 1 : senderJid = expéditeur réel, pas le groupe
    const senderJid = msg.key.participant || msg.key.remoteJid
    const quotedId  = msg.message?.extendedTextMessage?.contextInfo?.stanzaId

    // ── FIX SONG ─────────────────────────────────────────────────
    try {
      const { songSessions } = await import('../commands/media/song.js')
      if (quotedId && songSessions.has(jid)) {
        const session = songSessions.get(jid)
        if (quotedId === session.menuId) {
          const songCmd = commands.get('song')
          if (songCmd) {
            const isOwner = personality.isOwner(senderJid)
            await reactToMessage(sock, msg, 'media')
            await songCmd.execute(sock, msg, [body.trim()], { isOwner, senderJid })
            return
          }
        }
      }
    } catch {}

    // ── Détection reply menu ──────────────────────────────────────
    const { menuMessages } = await import('../commands/general/menu.js')

    if (quotedId && menuMessages.has(jid)) {
      const menuData = menuMessages.get(jid)
      if (quotedId === menuData.id) {
        const choice = body.trim()
        const subMenus = {
          '1': `⚙️ *GÉNÉRAL*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}ping — Latence\n▸ ${config.prefix}alive — Status\n▸ ${config.prefix}botinfo — Infos du bot\n▸ ${config.prefix}id — Ton ID WhatsApp\n▸ ${config.prefix}time — Heure actuelle\n▸ ${config.prefix}settings — Paramètres\n▸ ${config.prefix}getbot — Obtenir ce bot`,
          '2': `👥 *GROUPE*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}tagall — Tag tout le monde\n▸ ${config.prefix}kick — Exclure\n▸ ${config.prefix}promote — Promouvoir admin\n▸ ${config.prefix}demote — Rétrograder admin\n▸ ${config.prefix}mute — Fermer le groupe\n▸ ${config.prefix}unmute — Ouvrir le groupe\n▸ ${config.prefix}warn — Avertir (3 = kick)\n▸ ${config.prefix}rules — Règles\n▸ ${config.prefix}poll — Sondage\n▸ ${config.prefix}groupinfo — Infos groupe\n▸ ${config.prefix}welcome — Bienvenue on/off\n▸ ${config.prefix}goodbye — Sortie on/off\n▸ ${config.prefix}antigroup — Protections du groupe`,
          '3': `🎵 *MÉDIA & IA*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}song — Musique MP3\n▸ ${config.prefix}csong — Envoyer musique vers channel\n▸ ${config.prefix}lyrics — Paroles\n▸ ${config.prefix}ai — Parler à l'IA\n▸ ${config.prefix}translate — Traduire\n▸ ${config.prefix}ocr — Lire texte sur image`,
          '4': `🎮 *GAMES*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}joke — Blague\n▸ ${config.prefix}ship — Compatibilité\n▸ ${config.prefix}8ball — Boule magique\n▸ ${config.prefix}dare — Action ou Vérité\n▸ ${config.prefix}trivia — Quiz rapide\n▸ ${config.prefix}quiz — Quiz IA\n▸ ${config.prefix}rank — Niveau XP\n▸ ${config.prefix}leaderboard — Classement`,
          '5': `🛠️ *OUTILS*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}sticker — Créer sticker\n▸ ${config.prefix}vv — Anti view-once\n▸ ${config.prefix}tts — Texte en vocal\n▸ ${config.prefix}weather — Météo\n▸ ${config.prefix}calc — Calculatrice\n▸ ${config.prefix}qr — QR Code\n▸ ${config.prefix}getpp — Photo de profil\n▸ ${config.prefix}ocr — Lire texte sur image`,
          '6': menuData.isOwner ? `👑 *OWNER*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}broadcast — Message global\n▸ ${config.prefix}restart — Redémarrer\n▸ ${config.prefix}sudo — Gérer admins\n▸ ${config.prefix}mode — public/private/group\n▸ ${config.prefix}maintenance — Mode maintenance\n▸ ${config.prefix}eval — Exécuter code` : null
        }
        const subMenu = subMenus[choice]
        if (subMenu) {
          await sock.sendMessage(jid, { text: subMenu }, { quoted: msg })
          return
        }
      }
    }

    if (!body.startsWith(config.prefix)) return

    // Langue user
    try {
      const { getUserSettings } = await import('../commands/general/settings.js')
      const userSettings = await getUserSettings(senderJid)
      if (userSettings.lang) setUserLang(senderJid, userSettings.lang)
    } catch {}

    // Premier contact
    try {
      const seen = await redis.get(`seen:${senderJid}`)
      if (!seen) {
        await redis.set(`seen:${senderJid}`, '1', { ex: 60 * 60 * 24 * 365 })
        await sock.sendMessage(senderJid, {
          text: `╔══════════════════════╗\n  ⚡  B I E N V E N U E\n╚══════════════════════╝\n\nTu viens d'activer *${config.botName}*.\n\nJe suis opérationnel. Ne me fais pas perdre mon temps.\n\n▸ *${config.prefix}menu* — Voir mes commandes\n▸ *${config.prefix}alive* — Vérifier mon statut\n\n— *${config.botName}*\n_𝘊𝘰𝘯𝘴𝘵𝘳𝘶𝘪𝘵 𝘱𝘢𝘳 𝘭𝘦𝘴 𝘮𝘦𝘪𝘭𝘭𝘦𝘶𝘳𝘴._`
        })
      }
    } catch {}

    // Mode maintenance
    try {
      const { maintenanceMode } = await import('../commands/owner/maintenance.js')
      if (maintenanceMode && !personality.isOwner(senderJid)) {
        await sock.sendMessage(jid, { text: t(senderJid, 'maintenance') }, { quoted: msg })
        return
      }
    } catch {}

    const args    = body.slice(config.prefix.length).trim().split(/\s+/)
    const cmdName = args.shift().toLowerCase()
    const isOwner = personality.isOwner(senderJid)

    // FIX 1 — Cooldown global par sender réel
    if (!isOwner && isOnCooldown(senderJid)) return

    const command = commands.get(cmdName)

    // XP
    try {
      const { addXP } = await import('../commands/games/rank.js')
      await addXP(senderJid, 10)
    } catch {}

    if (!command) {
      await reactToMessage(sock, msg, 'default')
      await sock.sendMessage(jid, { text: t(senderJid, 'unknown_cmd') }, { quoted: msg })
      return
    }

    if (command.ownerOnly && !isOwner) {
      await reactToMessage(sock, msg, 'default')
      await sock.sendMessage(jid, { text: t(senderJid, 'no_permission') }, { quoted: msg })
      return
    }

    // FIX 2 — Rate limit par commande
    if (!isOwner && isOnCmdCooldown(senderJid, cmdName)) {
      const limit = CMD_LIMITS[cmdName]
      await sock.sendMessage(jid, {
        text: `⏳ Attends *${limit}s* avant de réutiliser *${config.prefix}${cmdName}*.\n\n— *${config.botName}*`
      }, { quoted: msg })
      return
    }

    // Mode
    try {
      const { botMode } = await import('../commands/owner/mode.js')
      const isGroup = jid.endsWith('@g.us')
      if (botMode === 'private' && !isOwner) return
      if (botMode === 'group' && !isGroup && !isOwner) {
        return sock.sendMessage(jid, { text: t(senderJid, 'group_only') }, { quoted: msg })
      }
    } catch {}

    // FIX 4 — Audit log commandes owner sensibles
    if (isOwner && OWNER_CMDS.has(cmdName)) {
      await auditLog(senderJid, cmdName, args)
    }

    await reactToMessage(sock, msg, command.category || 'default')

    // Proxy local
    const sockProxy = new Proxy(sock, {
      get(target, prop) {
        if (prop !== 'sendMessage') return target[prop]
        return async (jidArg, message, options = {}) => {
          const finalOptions = options && typeof options === 'object' ? { ...options } : {}
          if (!finalOptions.quoted) finalOptions.quoted = msg
          return target.sendMessage(jidArg, message, finalOptions)
        }
      }
    })

    await command.execute(sockProxy, msg, args, { isOwner, senderJid, quoted: true })

  } catch (err) {
    console.error('[MESSAGE HANDLER ERROR]', err)
  }
}

// NOTE: loadCommands() est appelé explicitement depuis index.js
// Ne pas l'appeler ici pour éviter le double chargement