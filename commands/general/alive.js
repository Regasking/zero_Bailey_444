import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'
import os from 'os'

const alivePhrases = [
  'Oui je suis là. Comme toujours. Contrairement à certains.',
  'Évidemment que je suis en ligne. Tu t\'attendais à quoi ?',
  'Toujours debout. Toujours meilleur.',
  'Je suis là depuis le début. Tu viens juste de t\'en rendre compte ?',
  'Vivant, actif, et franchement au-dessus de tout ça.',
]

export default {
  name: 'alive',
  alias: ['status', 'uptime'],
  desc: 'Status du bot',
  category: 'general',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
    const cpuLoad = os.loadavg()[0].toFixed(2)
    const phrase = alivePhrases[Math.floor(Math.random() * alivePhrases.length)]

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  ⚡  ${config.botName}\n╚══════════════════════╝\n\n_"${phrase}"_\n\n🟢 *Status :* En ligne\n⏱️ *Uptime :* ${hours}h ${minutes}m ${seconds}s\n🧠 *RAM :* ${ram} MB / ${totalRam} GB\n📡 *CPU Load :* ${cpuLoad}\n🌍 *Plateforme :* ${os.platform()} ${os.arch()}\n\n— *${config.botName}* | _Impossible à arrêter._\n${personality.maybeFlexCreator()}`
    })
  }
}