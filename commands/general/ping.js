import { personality } from '../../utils/personality.js'

export default {
  name: 'ping',
  alias: ['p'],
  desc: 'Latence du bot',
  category: 'general',

  async execute(sock, msg, args, { isOwner }) {
    const start = Date.now()
    const jid = msg.key.remoteJid

    await sock.sendMessage(jid, {
      text: personality.format('loading')
    }, { quoted: msg })

    const latency = Date.now() - start

    await sock.sendMessage(jid, {
      text: `${latency}ms. Tu voulais plus vite ?${personality.maybeFlexCreator()}`
    }, { quoted: msg })
  }
}