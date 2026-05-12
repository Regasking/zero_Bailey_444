import { personality } from '../../utils/personality.js'

export default {
  name: 'tagall',
  alias: ['everyone', 'all'],
  desc: 'Tag tout le monde',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid
    const groupMeta = await sock.groupMetadata(jid)
    const participants = groupMeta.participants

    const mentions = participants.map(p => p.id)
    const text = args.length
      ? args.join(' ')
      : personality.format('loading')

    let mentionText = `📢 *${text}*\n\n`
    participants.forEach(p => {
      mentionText += `@${p.id.split('@')[0]}\n`
    })

    await sock.sendMessage(jid, {
      text: mentionText,
      mentions
    })
  }
}