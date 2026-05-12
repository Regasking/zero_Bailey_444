import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'

export default {
  name: 'botinfo',
  alias: ['info'],
  desc: 'Infos du bot',
  category: 'general',

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid

    await sock.sendMessage(jid, {
      text: `⚡ *${config.botName}*
━━━━━━━━━━━━━━━━━━━━━
👤 *Owner :* 𝕽𝖊𝖌𝖆𝖘_𝖐𝖎𝖓𝖌 𝖉𝖙𝖍
👤 *Co-Owner :* 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」
⚙️ *Préfixe :* ${config.prefix}
🌐 *Plateforme :* WhatsApp
🤖 *IA :* Mistral AI
🎵 *Musique :* yt-dlp + aria2c
📦 *Version :* 1.0.0
━━━━━━━━━━━━━━━━━━━━━
_${personality.format('success')}_`
    })
  }
}