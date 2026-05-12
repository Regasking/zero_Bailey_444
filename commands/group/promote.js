import { personality } from '../../utils/personality.js'

export default {
  name: 'promote',
  alias: ['admin'],
  desc: 'Promouvoir un membre admin',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid

    const target = msg.message?.extendedTextMessage?.contextInfo?.participant
      || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!target) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nReply ou mentionne un membre.'
      })
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'promote')
      await sock.sendMessage(jid, {
        text: `👑 @${target.split('@')[0]} est maintenant admin.\n\n— ${personality.format('success')}`,
        mentions: [target]
      })
    } catch {
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}