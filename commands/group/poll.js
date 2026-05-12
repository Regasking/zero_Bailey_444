import { personality } from '../../utils/personality.js'

export default {
  name: 'poll',
  alias: ['sondage', 'vote'],
  desc: 'Créer un sondage',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid

    // Usage: .poll Question | Option1 | Option2 | Option3
    const input = args.join(' ')
    const parts = input.split('|').map(p => p.trim())

    if (parts.length < 3) {
      return sock.sendMessage(jid, {
        text: `${personality.format('error_usage')}\n\nUtilisation :\n.poll Question | Option1 | Option2 | Option3`
      })
    }

    const question = parts[0]
    const options = parts.slice(1)

    await sock.sendMessage(jid, {
      poll: {
        name: question,
        values: options,
        selectableCount: 1
      }
    })
  }
}