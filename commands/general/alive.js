import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'
import os from 'os'

export default {
  name: 'alive',
  alias: ['status', 'uptime'],
  desc: 'Status du bot',
  category: 'general',

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)

    await sock.sendMessage(jid, {
      text: `⚡ *${config.botName}*
━━━━━━━━━━━━━━━━━━━━━
🟢 *Status :* En ligne
⏱️ *Uptime :* ${hours}h ${minutes}m ${seconds}s
🧠 *RAM :* ${ram} MB
💾 *Total RAM :* ${totalRam} GB
━━━━━━━━━━━━━━━━━━━━━
${personality.format('success')}${personality.maybeFlexCreator()}`
    })
  }
}