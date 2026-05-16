import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

const cooldowns = new Map()
const COOLDOWN_MS = 60 * 1000 // 1 minute entre chaque tagall

export default {
  name: 'tagall',
  alias: ['everyone', 'all'],
  desc: 'Tag tout le monde dans le groupe',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    // ─── Anti-spam cooldown ────────────────────────────────────────────
    const lastUsed = cooldowns.get(jid) || 0
    const now = Date.now()
    const remaining = COOLDOWN_MS - (now - lastUsed)

    if (remaining > 0 && !isOwner) {
      const secs = Math.ceil(remaining / 1000)
      return sock.sendMessage(jid, {
        text: `⏳ Cooldown actif. Encore *${secs} secondes* avant le prochain tagall.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    cooldowns.set(jid, now)

    const groupMeta = await sock.groupMetadata(jid)
    const participants = groupMeta.participants
    const mentions = participants.map(p => p.id)

    const message = args.length ? args.join(' ') : '📢 Attention tout le monde.'

    let mentionText = `╔══════════════════════╗\n  📢  A T T E N T I O N\n╚══════════════════════╝\n\n*${message}*\n\n`
    participants.forEach(p => {
      mentionText += `@${p.id.split('@')[0]}\n`
    })
    mentionText += `\n— *${config.botName}* | _${participants.length} membres notifiés._`

    await sock.sendMessage(jid, {
      text: mentionText,
      mentions
    })
  }
}