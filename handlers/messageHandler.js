import { personality } from '../utils/personality.js'
import { config } from '../config.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export let globalStore = null
export function setStore(store) { globalStore = store }

// Auto-loader — charge toutes les commandes automatiquement
const commands = new Map()

export async function loadCommands() {
 const categories = ['general', 'group', 'media', 'games', 'tools', 'owner', 'ai']
  
  for (const category of categories) {
    const dir = path.join(__dirname, `../commands/${category}`)
    if (!fs.existsSync(dir)) continue
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'))
    
    for (const file of files) {
      const cmd = await import(`../commands/${category}/${file}`)
      const command = cmd.default
      commands.set(command.name, command)
      if (command.alias) {
        command.alias.forEach(a => commands.set(a, command))
      }
    }
  }
  console.log(`✅ ${commands.size} commandes chargées`)
}

// Cooldown system
const cooldowns = new Map()

function isOnCooldown(jid) {
  const now = Date.now()
  const last = cooldowns.get(jid) || 0
  if (now - last < config.settings.cooldown * 1000) return true
  cooldowns.set(jid, now)
  return false
}

export async function handleMessage(sock, msg) {
  try {
    const body = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.imageMessage?.caption
      || msg.message?.videoMessage?.caption
      || ''

    console.log('MSG RECU:', JSON.stringify(msg.message, null, 2))
    console.log('BODY:', body)
    console.log('FROM ME:', msg.key.fromMe)

    // Détection reply au menu
    const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId
    const { menuMessages } = await import('../commands/general/menu.js')

    if (quotedId && menuMessages.has(msg.key.remoteJid)) {
      const menuData = menuMessages.get(msg.key.remoteJid)
      
      if (quotedId === menuData.id) {
        const choice = body.trim()
        const subMenus = {
          '1': `⚙️ *GÉNÉRAL*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}ping — Latence\n▸ ${config.prefix}alive — Status\n▸ ${config.prefix}botinfo — Infos du bot\n▸ ${config.prefix}id — Ton ID WhatsApp\n▸ ${config.prefix}time — Heure actuelle\n▸ ${config.prefix}getbot — Obtenir ce bot`,
          '2': `👥 *GROUPE*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}tagall — Tag tout le monde\n▸ ${config.prefix}kick — Exclure\n▸ ${config.prefix}promote — Promouvoir admin\n▸ ${config.prefix}demote — Rétrograder admin\n▸ ${config.prefix}mute — Fermer le groupe\n▸ ${config.prefix}unmute — Ouvrir le groupe\n▸ ${config.prefix}warn — Avertir (3 = kick)\n▸ ${config.prefix}rules — Règles\n▸ ${config.prefix}poll — Sondage\n▸ ${config.prefix}groupinfo — Infos groupe\n▸ ${config.prefix}welcome — Bienvenue on/off\n▸ ${config.prefix}goodbye — Sortie on/off`,
          '3': `🎵 *MÉDIA & IA*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}song — Musique MP3\n▸ ${config.prefix}lyrics — Paroles\n▸ ${config.prefix}ai — Parler à l'IA\n▸ ${config.prefix}translate — Traduire\n▸ ${config.prefix}ocr — Lire texte sur image`,
          '4': `🎮 *GAMES*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}joke — Blague\n▸ ${config.prefix}ship — Compatibilité\n▸ ${config.prefix}8ball — Boule magique\n▸ ${config.prefix}dare — Action ou Vérité\n▸ ${config.prefix}trivia — Quiz rapide\n▸ ${config.prefix}quiz — Quiz IA\n▸ ${config.prefix}rank — Niveau XP\n▸ ${config.prefix}leaderboard — Classement`,
          '5': `🛠️ *OUTILS*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}sticker — Créer sticker\n▸ ${config.prefix}vv — Anti view-once\n▸ ${config.prefix}tts — Texte en vocal\n▸ ${config.prefix}weather — Météo\n▸ ${config.prefix}calc — Calculatrice\n▸ ${config.prefix}qr — QR Code\n▸ ${config.prefix}getpp — Photo de profil`,
          '6': menuData.isOwner ? `👑 *OWNER*\n━━━━━━━━━━━━━━━━━━━━━\n▸ ${config.prefix}broadcast — Message global\n▸ ${config.prefix}restart — Redémarrer\n▸ ${config.prefix}sudo — Gérer admins\n▸ ${config.prefix}mode — public/private/group\n▸ ${config.prefix}maintenance — Mode maintenance\n▸ ${config.prefix}eval — Exécuter code` : null
        }

        const subMenu = subMenus[choice]
        if (subMenu) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: subMenu
          }, { quoted: msg })
          return
        }
      }
    }

    if (!body.startsWith(config.prefix)) return
    // Autorise les messages de soi-même
    // if (msg.key.fromMe) return

    const jid = msg.key.remoteJid
    const senderJid = msg.key.participant || msg.key.remoteJid

    console.log('SENDER:', senderJid)
    console.log('OWNERS:', config.owners.map(o => o.number))

    // Mode maintenance
    try {
      const { maintenanceMode } = await import('../commands/owner/maintenance.js')
      const { personality } = await import('../utils/personality.js')
      if (maintenanceMode && !personality.isOwner(senderJid)) {
        await sock.sendMessage(jid, {
          text: '🔧 Bot en maintenance. Revenez plus tard.'
        }, { quoted: msg })
        return
      }
    } catch {}

    const args = body.slice(config.prefix.length).trim().split(/\s+/)
    const cmdName = args.shift().toLowerCase()
    const isOwner = personality.isOwner(senderJid)

    // Cooldown — pas pour les owners
    if (!isOwner && isOnCooldown(senderJid)) return

    const command = commands.get(cmdName)

    // Donner XP à chaque commande utilisée
    try {
      const { addXP } = await import('../commands/games/rank.js')
      addXP(senderJid, 10)
    } catch {}

    if (!command) {
      await sock.sendMessage(jid, {
        text: personality.format('unknown_cmd')
      }, { quoted: msg })
      return
    }

    // Commande owner only
    if (command.ownerOnly && !isOwner) {
      await sock.sendMessage(jid, {
        text: 'Tu n\'as pas accès à cette commande.'
      }, { quoted: msg })
      return
    }

    // Vérification du mode
    try {
      const { botMode } = await import('../commands/owner/mode.js')
      const isGroup = jid.endsWith('@g.us')

      if (botMode === 'private' && !isOwner) {
        return
      }
      if (botMode === 'group' && !isGroup && !isOwner) {
        return sock.sendMessage(jid, {
          text: '❌ Ce bot fonctionne uniquement en groupe.'
        }, { quoted: msg })
      }
    } catch {}

    const originalSendMessage = sock.sendMessage.bind(sock)
    sock.sendMessage = async (jidArg, message, options = {}) => {
      const finalOptions = options && typeof options === 'object' ? { ...options } : {}
      if (!finalOptions.quoted) finalOptions.quoted = msg
      return originalSendMessage(jidArg, message, finalOptions)
    }

    await command.execute(sock, msg, args, { isOwner, senderJid, quoted: true })

  } catch (err) {
    console.error('[MESSAGE HANDLER ERROR]', err)
  }
}

// Auto-init au chargement du module
loadCommands().catch(err => console.error('Erreur chargement commandes:', err))