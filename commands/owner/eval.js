import { personality } from '../../utils/personality.js'

export default {
  name: 'eval',
  alias: ['exec', 'run'],
  desc: 'Exécuter du code JS',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    if (!isOwner) return

    const code = args.join(' ')
    if (!code) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .eval <code>'
      })
    }

    try {
      let result = await eval(code)
      if (typeof result !== 'string') result = JSON.stringify(result, null, 2)

      await sock.sendMessage(jid, {
        text: `✅ *Résultat :*\n\`\`\`${result}\`\`\``
      })
    } catch (err) {
      await sock.sendMessage(jid, {
        text: `❌ *Erreur :*\n\`\`\`${err.message}\`\`\``
      })
    }
  }
}