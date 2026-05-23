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

const commands = new Map()
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
      if (!/^[\w\-]+\.js$/.test(file)) { console.warn(`[SECURITY] Fichier ignoré : ${file}`); continue }
      try {
        const cmd = await import(`../commands/${category}/${file}`)
        const command = cmd.default
        if (!command?.name || typeof command.execute !== 'function') continue
        commands.set(command.name, command)
        if (command.alias) command.alias.forEach(a => commands.set(a, command))
      } catch (err) { console.error(`[LOAD ERROR] ${category}/${file}:`, err.message) }
    }
  }
  try { _songModule        = await import('../commands/media/song.js') }       catch {}
  try { _menuModule        = await import('../commands/general/menu.js') }      catch {}
  try { _settingsModule    = await import('../commands/general/settings.js') }  catch {}
  try { _maintenanceModule = await import('../commands/owner/maintenance.js') } catch {}
  try { _rankModule        = await import('../commands/games/rank.js') }        catch {}
  try { _modeModule        = await import('../commands/owner/mode.js') }        catch {}
  console.log(`✅ ${commands.size} commandes chargées`)
}

// ═══════════ COOLDOWNS ═══════════
const cooldowns    = new Map()
const cmdCooldowns = new Map()
const CMD_LIMITS   = { ai: 10, song: 15, csong: 15, tts: 5, translate: 5, ocr: 10, sticker: 5, qr: 5, weather: 5 }
setInterval(() => {
  const now = Date.now()
  for (const [k, ts] of cooldowns) if (now - ts > config.settings.cooldown * 10000) cooldowns.delete(k)
  for (const [k, ts] of cmdCooldowns) { const l = CMD_LIMITS[k.split(':').pop()] || 10; if (now - ts > l * 10000) cmdCooldowns.delete(k) }
}, 60 * 60 * 1000)

function isOnCooldown(jid) {
  const now = Date.now(), last = cooldowns.get(jid) || 0
  if (now - last < config.settings.cooldown * 1000) return true
  cooldowns.set(jid, now); return false
}
function isOnCmdCooldown(jid, cmd) {
  const limit = CMD_LIMITS[cmd]; if (!limit) return false
  const key = `${jid}:${cmd}`, now = Date.now(), last = cmdCooldowns.get(key) || 0
  if (now - last < limit * 1000) return true
  cmdCooldowns.set(key, now); return false
}

// ═══════════ CACHE ═══════════
const seenCache     = new Set()
const settingsCache = new Map()
setInterval(() => settingsCache.clear(), 60 * 60 * 1000)

const MAX_STORE_SIZE = 500
export function addToStore(store, key, value) {
  if (store.size >= MAX_STORE_SIZE) store.delete(store.keys().next().value)
  store.set(key, value)
}

// ═══════════ AUDIT LOG ═══════════
const OWNER_CMDS = new Set(['eval', 'exec', 'run', 'broadcast', 'bc', 'restart', 'maintenance', 'mode', 'sudo'])
async function auditLog(senderJid, cmdName, args) {
  try {
    await redis.set(`audit:cmd:${Date.now()}`, JSON.stringify({ sender: senderJid, cmd: cmdName, args: args.join(' ').slice(0, 200), date: new Date().toISOString() }), { ex: 60 * 60 * 24 * 30 })
  } catch {}
}

// ═══════════ REACT ═══════════
const categoryEmojis = { general: ['⚡','✨','💫'], group: ['👥','⚙️','🔧'], media: ['🎵','🎬','📥'], games: ['🎮','🎯','🃏'], tools: ['🛠️','🔍','⚙️'], owner: ['👑','⚡','🔑'], ai: ['🤖','💡','🧠'], default: ['⚡','✅','💯'] }
async function reactToMessage(sock, msg, category = 'default') {
  try {
    const emojis = categoryEmojis[category] || categoryEmojis.default
    await sock.sendMessage(msg.key.remoteJid, { react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key } })
  } catch {}
}

// ═══════════ HANDLE MESSAGE ═══════════
export async function handleMessage(sock, msg, sessionId = null, sessionOwnerPhone = null, sessionOwnerLid = null) {
  try {
    const body = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.imageMessage?.caption
      || msg.message?.videoMessage?.caption
      || ''

    const jid       = msg.key.remoteJid
    const senderJid = msg.key.participant || msg.key.remoteJid
    const quotedId  = msg.message?.extendedTextMessage?.contextInfo?.stanzaId

    // ── senderNum : numéro brut de l'expéditeur, sans @ ni suffixe :X ──
    // Baileys ajoute parfois un suffixe multi-device (ex: 22890123456:2@s.whatsapp.net)
    const senderNum = senderJid.split('@')[0].split(':')[0]  // ex: "22890123456"

    const sessionPhone = sessionOwnerPhone?.replace(/\D/g, '') || null

    // ── isOwner : compare senderNum aux admins définis dans .env ──
    // config.owners[].number = "22890123456@s.whatsapp.net" (config.js ajoute le @)
    // config.owners[].lid    = "12345678901234@lid"
    // config.owners[].lid2   = idem (LID alternatif)
    // Vérification par numéro uniquement — le LID change selon l'appareil/session
    const isOwner = config.owners.some(o => {
      const num = o.number?.split('@')[0]?.split(':')[0]
      return num && num === senderNum
    })

    // ── isSessionOwner : isOwner OU le propriétaire de cette session ─
    const cleanSessionLid = sessionOwnerLid?.split('@')[0]?.split(':')[0]
    const isSessionOwner = isOwner
      || (sessionPhone && senderNum === sessionPhone)
      || (cleanSessionLid && senderNum === cleanSessionLid)

    // ── FIX SONG ─────────────────────────────────────────────────
    if (_songModule && quotedId) {
      const { songSessions } = _songModule
      if (songSessions?.has(jid)) {
        const session = songSessions.get(jid)
        if (quotedId === session.menuId) {
          const songCmd = commands.get('song')
          if (songCmd) {
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
          if (subMenu) { await sock.sendMessage(jid, { text: subMenu }, { quoted: msg }); return }
        }
      }
    }

    if (!body.startsWith(config.prefix)) return

    // ── Langue user ───────────────────────────────────────────────
    if (_settingsModule && !settingsCache.has(senderJid)) {
      try {
        const { getUserSettings } = _settingsModule
        const userSettings = await getUserSettings(senderJid)
        settingsCache.set(senderJid, userSettings)
        if (userSettings.lang) setUserLang(senderJid, userSettings.lang)
      } catch {}
    } else if (_settingsModule && settingsCache.has(senderJid)) {
      const s = settingsCache.get(senderJid)
      if (s.lang) setUserLang(senderJid, s.lang)
    }

    // ── Premier contact ───────────────────────────────────────────
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

    // ── Maintenance ───────────────────────────────────────────────
    if (_maintenanceModule) {
      try {
        const { maintenanceMode } = _maintenanceModule
        if (maintenanceMode && !isOwner) {
          await sock.sendMessage(jid, { text: t(senderJid, 'maintenance') }, { quoted: msg })
          return
        }
      } catch {}
    }

    const args    = body.slice(config.prefix.length).trim().split(/\s+/)
    const cmdName = args.shift().toLowerCase()

    console.log(`[CMD] ${senderNum} → .${cmdName} | isOwner=${isOwner} | isSessionOwner=${isSessionOwner} | lid=${sessionOwnerLid}`)

    // ── Blacklist ─────────────────────────────────────────────────
    if (!isOwner && !isSessionOwner) {
      try { if (await isBlacklisted(senderNum)) return } catch {}
    }

    // ── Cooldown global ───────────────────────────────────────────
    if (!isOwner && isOnCooldown(senderJid)) return

    const command = commands.get(cmdName)

    // ── XP fire-and-forget ────────────────────────────────────────
    if (_rankModule) _rankModule.addXP(senderJid, 10).catch(() => {})

    if (!command) {
      reactToMessage(sock, msg, 'default').catch(() => {})
      await sock.sendMessage(jid, { text: t(senderJid, 'unknown_cmd') }, { quoted: msg })
      return
    }

    if (command.ownerOnly && !isOwner && !isSessionOwner) {
      reactToMessage(sock, msg, 'default').catch(() => {})
      await sock.sendMessage(jid, { text: t(senderJid, 'no_permission') }, { quoted: msg })
      return
    }

    if (!isOwner && isOnCmdCooldown(senderJid, cmdName)) {
      await sock.sendMessage(jid, { text: `⏳ Attends *${CMD_LIMITS[cmdName]}s* avant de réutiliser *${config.prefix}${cmdName}*.\n\n— *${config.botName}*` }, { quoted: msg })
      return
    }

    // ── Mode bot par session ──────────────────────────────────────
    if (_modeModule) {
      try {
        const { getBotMode } = _modeModule
        const botMode = await getBotMode(sessionId)
        const isGroup = jid.endsWith('@g.us')
        if (botMode === 'private' && !isSessionOwner) return // silencieux
        if (botMode === 'group' && !isGroup && !isSessionOwner) {
          return sock.sendMessage(jid, { text: `Je travaille en groupe uniquement. Va dans un groupe.\n\n— *${config.botName}*` }, { quoted: msg })
        }
      } catch {}
    }

    // ── Audit log ─────────────────────────────────────────────────
    if (isOwner && OWNER_CMDS.has(cmdName)) auditLog(senderJid, cmdName, args).catch(() => {})

    // ── React ─────────────────────────────────────────────────────
    reactToMessage(sock, msg, command.category || 'default').catch(() => {})

    // ── Proxy auto-quote ──────────────────────────────────────────
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