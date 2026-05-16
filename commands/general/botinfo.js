import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'
import { botStats, getUptime, getRAMUsage, countRealUsers } from '../../index.js'
import os from 'os'

export default {
  name: 'botinfo',
  alias: ['info', 'stats'],
  desc: 'Infos et statistiques du bot',
  category: 'general',

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid

    // Récupérer les utilisateurs réels depuis Redis
    const realUsers = await countRealUsers()

    const ramUsed = getRAMUsage()
    const uptime  = getUptime()
    const ping    = Date.now() - (msg.messageTimestamp * 1000)

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗
  ⚡  B O T  I N F O
╚══════════════════════╝

*${config.botName}*
_The Lion's Sin Of Pride_

━━━━━━━━━━━━━━━━━━━━━
👑 *Owner :* 𝕽𝖊𝖌𝖆𝖘_𝖐𝖎𝖓𝖌 𝖉𝖙𝖍
👑 *Co-Owner :* 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」
⚙️ *Préfixe :* ${config.prefix}
📦 *Version :* ${botStats.version}

━━━━━━━━━━━━━━━━━━━━━
📊 *S T A T I S T I Q U E S*
━━━━━━━━━━━━━━━━━━━━━
👥 *Groupes :* ${botStats.groupCount}
👤 *Utilisateurs réels :* ${realUsers}
👤 *Membres (groupes) :* ${botStats.userCount}
💬 *Messages traités :* ${botStats.messagesHandled}
⚡ *Commandes utilisées :* ${botStats.commandsUsed}

━━━━━━━━━━━━━━━━━━━━━
🖥️  *S Y S T È M E*
━━━━━━━━━━━━━━━━━━━━━
⏱️ *Uptime :* ${uptime}
🏓 *Ping :* ${ping > 0 ? ping : '< 1'}ms
💾 *RAM :* ${ramUsed}
🖥️ *OS :* ${os.platform()} ${os.release()}
🤖 *IA :* Mistral AI
🎵 *Musique :* yt-dlp + aria2c
🌐 *Plateforme :* WhatsApp Web

━━━━━━━━━━━━━━━━━━━━━
— *${config.botName}* | _${personality.format('success')}_`
    })

    // Incrémenter le compteur de commandes
    botStats.commandsUsed++
  }
}