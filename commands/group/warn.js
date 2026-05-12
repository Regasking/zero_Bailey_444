import { personality } from '../../utils/personality.js'

const warns = new Map()

export default {
  name: 'warn',
  alias: ['avertir'],
  desc: 'Avertir un membre',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid

    const target = msg.message?.extendedTextMessage?.contextInfo?.participant
      || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!target) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nReply ou mentionne un membre'
      })
    }

    const key = `${jid}:${target}`
    const count = (warns.get(key) || 0) + 1
    warns.set(key, count)

    if (count >= 3) {
      warns.delete(key)
      await sock.groupParticipantsUpdate(jid, [target], 'remove')
      await sock.sendMessage(jid, {
        text: `⛔ @${target.split('@')[0]} a reçu 3 avertissements. Expulsé.\n\n— ${personality.format('success')}`,
        mentions: [target]
      })
    } else {
      await sock.sendMessage(jid, {
        text: `⚠️ @${target.split('@')[0]} — Avertissement *${count}/3*\n\nEncore ${3 - count} avant l'expulsion.`,
        mentions: [target]
      })
    }
  }
}