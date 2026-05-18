import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  name: 'adminmenu',
  alias: ['adm', 'admin'],
  desc: 'Menu admin global (créateur uniquement)',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    // Réservé au hard owner (toi uniquement)
    if (!personality.isHardOwner(senderJid)) return

    const p = config.prefix

    const menu = `╔══════════════════════════════╗
  ⚡  P A N N E A U   D U   C R É A T E U R
╚══════════════════════════════╝
_Toi seul mérites de voir ça._

👑 *CONTRÔLE GLOBAL*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}syscast <msg>\` — Parler à tous mes clones
▸ \`${p}syscast veille\` — Annoncer ma mise en veille
▸ \`${p}maintenance on/off\` — Fermer boutique
▸ \`${p}restart\` — Me réveiller

🚫 *SANCTIONS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}blacklist add <num> [raison]\` — Bannir à vie
▸ \`${p}blacklist remove <num>\` — Grâce accordée
▸ \`${p}blacklist list\` — Voir les indésirables

📢 *DIFFUSION*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}broadcast <msg>\` — Tous les groupes
▸ \`${p}broadcast logs\` — Historique

⚙️ *OUTILS*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}sudo add/remove <num>\` — Gérer les sous-fifres
▸ \`${p}eval <code>\` — Exécuter du code
▸ \`${p}stats\` — Voir mes chiffres

— *${config.botName}*
_𝘓𝘦 𝘴𝘦𝘶𝘭 𝘲𝘶𝘪 𝘮𝘦 𝘤𝘰𝘮𝘮𝘢𝘯𝘥𝘦 𝘷𝘳𝘢𝘪𝘮𝘦𝘯𝘵._`

    try {
      const imgBuffer = fs.readFileSync(path.join(__dirname, '../../assets/adminmenu.jpg'))
      await sock.sendMessage(jid, { image: imgBuffer, caption: menu }, { quoted: msg })
    } catch {
      await sock.sendMessage(jid, { text: menu }, { quoted: msg })
    }
  }
}