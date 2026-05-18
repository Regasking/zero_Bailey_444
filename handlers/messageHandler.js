import { personality } from '../utils/personality.js'
import { isBlacklisted } from '../commands/owner/syscast.js'
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

// Cache des modules dynamiques — chargés UNE seule fois au démarrage
let _songModule       = null
let _menuModule       = null
let _settingsModule   = null
let _maintenanceModule = null
let _rankModule       = null
let _modeModule       = null

export async function loadCommands() {
  const categories = ['general', 'group', 'media', 'games', 'tools', 'owner', 'ai']

  for (const category of categories) {
    const dir = path.join(__dirname, `../commands/${category}`)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'))

    for (const file of files) {
      if (!/^[\w\-]+\.js$/.test(file)) {
        console.warn(`[SECURITY] Fichier ignoré (nom suspect) : ${file}`)
        continue
      }
      try {
        const cmd     = await import(`../commands/${category}/${file}`)
        const command = cmd.default
        if (!command?.name || typeof command.execute !== 'function') continue
        commands.set(command.name, command)
        if (command.alias) command.alias.forEach(a => commands.set(a, command))
      } catch (err) {
        console.error(`[LOAD ERROR] ${category}/${file}:`, err.message)
      }
    }
  }

  // Pré-chargement des modules fréquemment accédés
  // Évite les import() dynamiques à chaque message (lent + inutile)
  try { _songModule        = await import('../commands/media/song.js') }        catch {}
  try { _menuModule        = await import('../commands/general/menu.js') }       catch {}
  try { _settingsModule    = await import('../commands/general/settings.js') }   catch {}
  try { _maintenanceModule = await import('../commands/owner/maintenance.js') }  catch {}
  try { _rankModule        = await import('../commands/games/rank.js') }         catch {}
  try { _modeModule        = await import('../commands/owner/mode.js') }         catch {}

  console.log(`✅ ${commands.size} commandes chargées`)
}

// ═══════════════════════════════════════════════════════════════
// COOLDOWN PAR SENDER RÉEL + NETTOYAGE AUTO
// ═══════════════════════════════════════════════════════════════
const cooldowns    = new Map()
const cmdCooldowns = new Map()

const CMD_LIMITS = {
  ai: 10, song: 15, csong: 15, tts: 5,
  translate: 5, ocr: 10, sticker: 5, qr: 5, weather: 5,
}

// Nettoyage des Maps cooldown toutes les heures (évite la fuite mémoire)
setInterval(() => {
  const now = Date.now()
  for (const [key, ts] of cooldowns) {
    if (now - ts > config.settings.cooldown * 1000 * 10) cooldowns.delete(key)
  }
  for (const [key, ts] of cmdCooldowns) {
    const cmdName = key.split(':').pop()
    const limit   = CMD_LIMITS[cmdName] || 10
    if (now - ts > limit * 1000 * 10) cmdCooldowns.delete(key)
  }
}, 60 * 60 * 1000)

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
// CACHE MÉMOIRE LOCAL (évite les requêtes Redis répétitives)
// ═══════════════════════════════════════════════════════════════
const seenCache    = new Set()         // utilisateurs déjà vus (premier contact)
const settingsCache = new Map()        // settings par JID

// Nettoyage du cache settings toutes les heures
setInterval(() => settingsCache.clear(), 60 * 60 * 1000)

// ═══════════════════════════════════════════════════════════════
// STORE BORNÉ (max 500 entrées)
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
// AUDIT LOG COMMANDES OWNER
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
export async function handleMessage(sock, msg, sessionId = null, sessionOwnerPhone = null) {
  try {
    const body = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.imageMessage?.caption
      || msg.message?.videoMessage?.caption
      || ''

    const jid       = msg.key.remoteJid
    const senderJid = msg.key.participant || msg.key.remoteJid
    const quotedId  = msg.message?.extendedTextMessage?.contextInfo?.stanzaId

    // ── FIX SONG ─────────────────────────────────────────────────
    // Utilise le module pré-chargé au lieu d'import() dynamique
    if (_songModule && quotedId) {
      const { songSessions } = _songModule
      if (songSessions?.has(jid)) {
        const session = songSessions.get(jid)
        if (quotedId === session.menuId) {
          const songCmd = commands.get('song')
          if (songCmd) {
            const senderNum = senderJid.split('@')[0].split(':')[0]
    const sessionPhone = sessionOwnerPhone ? sessionOwnerPhone.replace(/\D/g, '') : null

    // Vérifie si senderNum matche numéro OU lid OU lid2 de n'importe quel owner config
    const isOwner = config.owners.some(o => {
      const num  = o.number?.split('@')[0]?.split(':')[0]?.trim()
      const lid  = o.lid?.split('@')[0]?.split(':')[0]?.trim()
      const lid2 = o.lid2?.split('@')[0]?.split(':')[0]?.trim()
      return (num && num === senderNum) || (lid && lid === senderNum) || (lid2 && lid2 === senderNum)
    })

    // Owner de session = même logique + numéro saisi au dashboard
    const isSessionOwner = isOwner || (sessionPhone && senderNum === sessionPhone)

    console.log(`[CMD] ${senderNum} → .${cmdName} | isOwner=${isOwner} | isSessionOwner=${isSessionOwner} | sessionPhone=${sessionPhone}`)

    // Blacklist globale — ignorer silencieusement
    if (!isOwner && !isSessionOwner) {
      try {
        if (await isBlacklisted(senderNum)) return
      } catch {}
    }
            await reactToMessage(sock, msg, 'media')
            await songCmd.execute(sock, msg, [body.trim()], { isOwner, senderJid })
            return
          }
        }
      }
    }

    // ── Détection reply menu ──────────────────────────────────────
    if (_menuModule && quotedId) {
      const { menuMessages } = _menuModule
      if (menuMessages?.has(jid)) {
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
    }

    if (!body.startsWith(config.prefix)) return

    // Langue user (cache mémoire d'abord, Redis seulement si absent)
    if (_settingsModule && !settingsCache.has(senderJid)) {
      try {
        const { getUserSettings } = _settingsModule
        const userSettings = await getUserSettings(senderJid)
        settingsCache.set(senderJid, userSettings)
        if (userSettings.lang) setUserLang(senderJid, userSettings.lang)
      } catch {}
    } else if (_settingsModule && settingsCache.has(senderJid)) {
      const userSettings = settingsCache.get(senderJid)
      if (userSettings.lang) setUserLang(senderJid, userSettings.lang)
    }

    // Premier contact — fire and forget, ne bloque pas la commande
    if (!seenCache.has(senderJid)) {
      seenCache.add(senderJid)
      redis.get(`seen:${senderJid}`).then(async seen => {
        if (!seen) {
          await redis.set(`seen:${senderJid}`, '1', { ex: 60 * 60 * 24 * 365 })
          const welcomeImg = path.join(__dirname, '../assets/welcome.jpg')
          const caption = personality.getWelcomeMessage(config.botName) + `\n\n▸ *${config.prefix}menu* — Si t'es perdu\n▸ *${config.prefix}alive* — Pour vérifier que je daigne encore répondre`
          try {
            const imgBuffer = fs.readFileSync(welcomeImg)
            sock.sendMessage(senderJid, { image: imgBuffer, caption }).catch(() => {})
          } catch {
            sock.sendMessage(senderJid, { text: caption }).catch(() => {})
          }
        }
      }).catch(() => {})
    }

    // Mode maintenance (module pré-chargé)
    if (_maintenanceModule) {
      try {
        const { maintenanceMode } = _maintenanceModule
        if (maintenanceMode && !personality.isOwner(senderJid)) {
          await sock.sendMessage(jid, { text: t(senderJid, 'maintenance') }, { quoted: msg })
          return
        }
      } catch {}
    }

    const args    = body.slice(config.prefix.length).trim().split(/\s+/)
    const cmdName = args.shift().toLowerCase()
    const senderNum = senderJid.split('@')[0].split(':')[0]
    const sessionPhone = sessionOwnerPhone ? sessionOwnerPhone.replace(/\D/g, '') : null

    // Vérifie si senderNum matche numéro OU lid OU lid2 de n'importe quel owner config
    const isOwner = config.owners.some(o => {
      const num  = o.number?.split('@')[0]?.split(':')[0]?.trim()
      const lid  = o.lid?.split('@')[0]?.split(':')[0]?.trim()
      const lid2 = o.lid2?.split('@')[0]?.split(':')[0]?.trim()
      return (num && num === senderNum) || (lid && lid === senderNum) || (lid2 && lid2 === senderNum)
    })

    // Owner de session = même logique + numéro saisi au dashboard
    const isSessionOwner = isOwner || (sessionPhone && senderNum === sessionPhone)

    console.log(`[CMD] ${senderNum} → .${cmdName} | isOwner=${isOwner} | isSessionOwner=${isSessionOwner} | sessionPhone=${sessionPhone}`)

    // Blacklist globale — ignorer silencieusement
    if (!isOwner && !isSessionOwner) {
      try {
        if (await isBlacklisted(senderNum)) return
      } catch {}
    }

    // Cooldown global par sender réel
    if (!isOwner && isOnCooldown(senderJid)) return

    const command = commands.get(cmdName)

    // XP — fire and forget, on n'attend pas Redis
    if (_rankModule) {
      const { addXP } = _rankModule
      addXP(senderJid, 10).catch(() => {})
    }

    if (!command) {
      reactToMessage(sock, msg, 'default').catch(() => {})
      await sock.sendMessage(jid, { text: t(senderJid, 'unknown_cmd') }, { quoted: msg })
      return
    }

    if (command.ownerOnly && !isOwner) {
      reactToMessage(sock, msg, 'default').catch(() => {})
      await sock.sendMessage(jid, { text: t(senderJid, 'no_permission') }, { quoted: msg })
      return
    }

    // Rate limit par commande
    if (!isOwner && isOnCmdCooldown(senderJid, cmdName)) {
      const limit = CMD_LIMITS[cmdName]
      await sock.sendMessage(jid, {
        text: `⏳ Attends *${limit}s* avant de réutiliser *${config.prefix}${cmdName}*.\n\n— *${config.botName}*`
      }, { quoted: msg })
      return
    }

    // Mode bot — par session (chaque abonné contrôle son propre bot)
    if (_modeModule) {
      try {
        const { getBotMode } = _modeModule
        const botMode = await getBotMode(sessionId)
        const isGroup = jid.endsWith('@g.us')
        // private : seul l'owner de session peut utiliser le bot
        if (botMode === 'private' && !isSessionOwner) {
          // Silencieux — on répond rien pour pas confirmer que le bot existe
          return
        }
        if (botMode === 'group' && !isGroup && !isSessionOwner) {
          return sock.sendMessage(jid, { text: `Je travaille en groupe uniquement. Va dans un groupe.\n\n— *${config.botName}*` }, { quoted: msg })
        }
      } catch {}
    }

    // Audit log — fire and forget
    if (isOwner && OWNER_CMDS.has(cmdName)) {
      auditLog(senderJid, cmdName, args).catch(() => {})
    }

    // React — fire and forget, on n'attend pas avant d'exécuter la commande
    reactToMessage(sock, msg, command.category || 'default').catch(() => {})

    // Proxy local (auto-quote)
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

    await command.execute(sockProxy, msg, args, { isOwner, isSessionOwner, senderJid, quoted: true, sessionId })

  } catch (err) {
    console.error('[MESSAGE HANDLER ERROR]', err)
  }
}