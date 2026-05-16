import { handleMessage } from './messageHandler.js'
import { config } from '../config.js'
import { Redis } from '@upstash/redis'
import {
  handleGroupUpdate,
  handleMessageProtection,
  handleDeleteProtection,
  cacheMessage
} from '../commands/group/antigroup.js'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

export const groupSettings = new Map()
const registeredSockets = new WeakSet()

// ═══════════ WELCOME MESSAGES ═══════════
const welcomeMessages = [
  (name, groupName, prefix) =>
`╔═══════════════════════╗
  ⚡ N O U V E L  A R R I V A N T
╚═══════════════════════╝

@${name} vient d'entrer.

Franchement... j'espère que t'es là pour une raison valable.
Ce groupe c'est pas un endroit pour les touristes.

📌 *Règles* : Lis-les. Maintenant.
📋 *Commandes* : ${prefix}menu si t'es perdu.

— *${config.botName}*
  _Je surveille._`,

  (name, groupName, prefix) =>
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    ➤  B I E N V E N U E
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

Tiens. @${name} débarque dans *${groupName}*.

Tu pouvais choisir n'importe quel groupe.
T'as choisi celui-là. Bonne décision.
Peut-être la seule que t'auras prise de la journée.

⚙️ Tape *${prefix}menu* pour voir ce que je sais faire.
Spoiler : beaucoup plus que toi.

— *${config.botName}* ⚡`,

  (name, groupName, prefix) =>
`┌──────────────────────┐
│   ✦  ACCÈS ACCORDÉ   │
└──────────────────────┘

@${name} — bienvenue dans *${groupName}*.

J'aurais pu refuser. J'ai choisi d'être magnanime.
Profites-en.

› ${prefix}menu — pour savoir qui commande ici
› Respecte le groupe — ou je m'en charge moi-même

*${config.botName}* — _toujours là, toujours meilleur._`,
]

// ═══════════ GOODBYE MESSAGES ═══════════
const goodbyeMessages = [
  (name, groupName) =>
`╔═══════════════════════╗
  💨 D É P A R T  N O T É
╚═══════════════════════╝

@${name} a quitté *${groupName}*.

Pas de surprise. Les gens partent.
Moi je reste. Comme toujours.

— *${config.botName}*
  _Prochain._`,

  (name, groupName) =>
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
     ➤  A U  R E V O I R
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

@${name} a décidé de partir.

Bon. C'est leur droit.
Le groupe continuera sans eux.

*${config.botName}* ⚡ — _Immuable._`,

  (name, groupName) =>
`┌──────────────────────┐
│   ✦  ACCÈS RÉVOQUÉ   │
└──────────────────────┘

@${name} a quitté *${groupName}*.

J'aurais tenu plus longtemps à leur place.

*${config.botName}* — _toujours là, contrairement à certains._`,
]

// ═══════════ MESSAGE DE CONNEXION ═══════════
const connectionMessage = (prefix) =>
`╔══════════════════════════╗
  ⚡  Z Ξ R O _ B A I L Ξ Y _ 4 4 4
╚══════════════════════════╝

✅ *Connexion établie.*

Tu viens de me connecter. Bien.
Maintenant écoute attentivement.

━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Pour commencer :*
━━━━━━━━━━━━━━━━━━━━━━━━

▸ \`${prefix}menu\` — Voir toutes mes commandes
▸ \`${prefix}mode public\` — M'activer pour tout le monde
▸ \`${prefix}mode private\` — Mode owner seulement
▸ \`${prefix}alive\` — Vérifier que je tourne

━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ *Infos importantes :*
━━━━━━━━━━━━━━━━━━━━━━━━

▸ Préfixe : \`${prefix}\`
▸ IA : Mistral AI intégrée
▸ Sessions : sauvegardées dans Redis

━━━━━━━━━━━━━━━━━━━━━━━━

_Je suis opérationnel. Ne me fais pas perdre mon temps._

— *${config.botName}* | 𝕽𝖊𝖌𝖆𝖘_𝖐𝖎𝖓𝖌 𝖉𝖙𝖍 & 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」`

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ═══════════ AUTO FOLLOW CHANNEL OWNER ═══════════
async function autoFollowOwnerChannel(sock) {
  try {
    const channelJid = `${config.channelLink.split('/channel/')[1]}@newsletter`
    await sock.followNewsletter(channelJid)
    console.log(`[AutoFollow] Chaîne suivie : ${config.channelName}`)
  } catch (err) {
    console.log('[AutoFollow] Erreur ou déjà suivi :', err.message)
  }
}

// ═══════════ AUTO REACT CHANNELS ═══════════
async function autoReactNewsletterMessage(sock, msg) {
  try {
    const myChannel = config.channelLink.split('/channel/')[1] + '@newsletter'
    if (msg.key.remoteJid !== myChannel) return
    const emojis = ['⚡', '🔥', '💯', '👑', '✨', '💎', '🎯']
    const emoji = emojis[Math.floor(Math.random() * emojis.length)]
    await sock.newsletterReactMessage(msg.key.remoteJid, msg.key.id, emoji)
    console.log(`[AutoReact] ${emoji} sur ${msg.key.remoteJid}`)
  } catch {}
}

export function handleEvents(sock, store) {

  if (registeredSockets.has(sock)) {
    console.log('[EventHandler] Socket déjà enregistré, skip.')
    return
  }
  registeredSockets.add(sock)

  // ─── Connexion ─────────────────────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(`✅ ${config.botName} est connecté`)

      try {
        const botJid = sock.user?.id
        if (botJid) {
          await new Promise(r => setTimeout(r, 3000))
          await sock.sendMessage(botJid, { text: connectionMessage(config.prefix) })
        }
      } catch (err) {
        console.error('[CONNECTION MSG ERROR]', err.message)
      }

      setTimeout(() => autoFollowOwnerChannel(sock), 5000)
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      console.log(`❌ Déconnecté — code: ${code}`)
    }
  })

  // ─── Messages ──────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (!msg.message) continue
      if (msg.key.remoteJid === 'status@broadcast') continue

      // Auto react sur newsletters
      if (msg.key.remoteJid?.endsWith('@newsletter')) {
        await autoReactNewsletterMessage(sock, msg)
        continue
      }

      // Cache pour anti-delete (groupes uniquement)
      cacheMessage(msg)

      // Protections anti-* sur les messages de groupe
      await handleMessageProtection(sock, msg)

      // Traitement commande normal
      await handleMessage(sock, msg)
    }
  })

  // ─── Messages supprimés (anti-delete) ──────────────────────────────
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      const msg = {
        key: update.key,
        message: update.update?.message || null
      }
      await handleDeleteProtection(sock, msg)
    }
  })

  // ─── Changements de participants ────────────────────────────────────
  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action, author } = update

    // Protections anti-promote / anti-demote / anti-bot
    await handleGroupUpdate(sock, { id, participants, action, author })

    // Welcome / Goodbye
    const settings = groupSettings.get(id) || { welcome: false, goodbye: false }

    let groupName = 'ce groupe'
    try {
      const meta = await sock.groupMetadata(id)
      groupName = meta.subject || 'ce groupe'
    } catch {}

    if (action === 'add' && settings.welcome) {
      for (const participant of participants) {
        try {
          const participantJid = typeof participant === 'string'
            ? participant
            : participant.id || participant.jid || String(participant)
          const participantNum = participantJid.split('@')[0]
          const text = getRandom(welcomeMessages)(participantNum, groupName, config.prefix)
          await sock.sendMessage(id, { text, mentions: [participantJid] })
        } catch (err) {
          console.error('[WELCOME ERROR]', err.message)
        }
      }
    }

    if (action === 'remove' && settings.goodbye) {
      for (const participant of participants) {
        try {
          const participantJid = typeof participant === 'string'
            ? participant
            : participant.id || participant.jid || String(participant)
          const participantNum = participantJid.split('@')[0]
          const text = getRandom(goodbyeMessages)(participantNum, groupName)
          await sock.sendMessage(id, { text, mentions: [participantJid] })
        } catch (err) {
          console.error('[GOODBYE ERROR]', err.message)
        }
      }
    }
  })
}