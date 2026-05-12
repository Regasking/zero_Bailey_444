import { personality } from '../../utils/personality.js'

export default {
  name: 'kick',
  alias: ['remove', 'ban'],
  desc: 'Exclure un membre',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    const target = msg.message?.extendedTextMessage?.contextInfo?.participant
      || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!target) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : reply ou mentionne un membre'
      })
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'remove')
      await sock.sendMessage(jid, {
        text: `✅ @${target.split('@')[0]} expulsé.\n\n${personality.format('owner_cmd')}`,
        mentions: [target]
      })
    } catch (err) {
      await sock.sendMessage(jid, {
        text: personality.format('error_technical')
      })
    }
  }
}