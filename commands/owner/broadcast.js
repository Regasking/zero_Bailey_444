import { personality } from '../../utils/personality.js'

export default {
  name: 'broadcast',
  alias: ['bc'],
  desc: 'Envoyer un message à tous les groupes',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid

    if (!isOwner) return

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .broadcast <message>'
      })
    }

    const message = args.join(' ')
    const groups = await sock.groupFetchAllParticipating()
    const groupIds = Object.keys(groups)

    await sock.sendMessage(jid, {
      text: `📢 Envoi en cours à *${groupIds.length}* groupes...`
    })

    let success = 0
    let failed = 0

    for (const groupId of groupIds) {
      try {
        await sock.sendMessage(groupId, { text: message })
        success++
        await new Promise(r => setTimeout(r, 1000))
      } catch {
        failed++
      }
    }

    await sock.sendMessage(jid, {
      text: `✅ Broadcast terminé\n✔️ Succès : ${success}\n❌ Échecs : ${failed}\n\n— ${personality.format('owner_cmd')}`
    })
  }
}