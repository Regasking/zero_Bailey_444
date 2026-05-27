import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'

// Limites selon le rôle
const LIMITS = {
  hardOwner: 20000,   // Toi
  owner: 200,        // Co-owner (Enzo)
  user: 50          // Utilisateurs lambda
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default {
  name: 'spam',
  alias: ['flood'],
  desc: 'Envoyer un message plusieurs fois',
  category: 'tools',

  async execute(sock, msg, args, { isOwner, isSessionOwner, senderJid }) {
    const jid = msg.key.remoteJid
    const p = config.prefix
    const isHard = personality.isHardOwner(senderJid)
    const isAdmin = isOwner || isSessionOwner

    // Limite selon le rôle
    const maxAllowed = isHard ? LIMITS.hardOwner : isAdmin ? LIMITS.owner : LIMITS.user

    // ── Détecter si mention (DM) ou groupe ───────────────────
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    let target, count, text

    if (mentioned) {
      // .spam @user <n> <message>
      count = parseInt(args[0])
      text = args.slice(1).join(' ')
      target = mentioned
    } else {
      // .spam <n> <message> (groupe ou DM actuel)
      count = parseInt(args[0])
      text = args.slice(1).join(' ')
      target = jid
    }

    // Validations
    if (!count || isNaN(count) || count < 1) {
      return sock.sendMessage(jid, { text:
`*Utilisation :*\n▸ \`${p}spam <n> <message>\` — Spam dans ce chat\n▸ \`${p}spam @user <n> <message>\` — Spam en DM\n\n📊 Ta limite : *${maxAllowed} messages*\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (!text || !text.trim()) {
      return sock.sendMessage(jid, {
        text: `Tu veux spam quoi exactement ?\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (count > maxAllowed) {
      return sock.sendMessage(jid, {
        text: `⚠️ Limite dépassée. Maximum autorisé pour toi : *${maxAllowed}*\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    // Confirmation avant d'envoyer
    await sock.sendMessage(jid, {
      text: `📨 Envoi de *${count}* messages${mentioned ? ` à @${target.split('@')[0]}` : ''}...\n\n— *${config.botName}*`,
      mentions: mentioned ? [target] : []
    }, { quoted: msg })

    // ── Envoi ─────────────────────────────────────────────────
    let sent = 0
    for (let i = 0; i < count; i++) {
      try {
        await sock.sendMessage(target, { text })
        sent++
      } catch {
        break // Stop si erreur (ex: numéro inexistant)
      }
      await sleep(500) // 0.5s entre chaque message
    }

    await sock.sendMessage(jid, {
      text: `✅ *${sent}/${count}* messages envoyés.\n\n— *${config.botName}*`
    }, { quoted: msg })
  }
}
