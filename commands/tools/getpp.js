import { personality } from '../../utils/personality.js'

export default {
  name: 'getpp',
  alias: ['pp', 'pfp', 'photo'],
  desc: 'Photo de profil d\'un membre',
  category: 'tools',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid

    const target = msg.message?.extendedTextMessage?.contextInfo?.participant
      || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || senderJid

    try {
      const ppUrl = await sock.profilePictureUrl(target, 'image')

      await sock.sendMessage(jid, {
        image: { url: ppUrl },
        caption: `📸 Photo de profil de @${target.split('@')[0]}\n\n— ${personality.format('success')}`,
        mentions: [target]
      })
    } catch {
      await sock.sendMessage(jid, {
        text: `❌ @${target.split('@')[0]} n'a pas de photo de profil ou l'a cachée.`,
        mentions: [target]
      })
    }
  }
}