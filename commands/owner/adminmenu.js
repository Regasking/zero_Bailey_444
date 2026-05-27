import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  name: 'adminmenu',
  alias: ['adm', 'admin'],
  desc: 'Menu admin',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, isSessionOwner, senderJid, sessionId }) {
    const jid = msg.key.remoteJid
    const p = config.prefix

    // ── Hard owner (toi) : menu complet ──────────────────────────
    // Récupérer le LID de session pour isHardOwner
    const { sessions } = await import('../../server.js').catch(() => ({ sessions: null }))
    const liveSession = sessions?.get(sessionId)
    const sessionLid = liveSession?.ownerLid?.split('@')[0]?.split(':')[0] || null
    if (personality.isHardOwner(senderJid, sessionLid)) {
      const menu =
`╔══════════════════════════════╗
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
        return await sock.sendMessage(jid, { image: imgBuffer, caption: menu }, { quoted: msg })
      } catch {
        return await sock.sendMessage(jid, { text: menu }, { quoted: msg })
      }
    }

    // ── Co-owner (Enzo) : menu réduit, sans les commandes sensibles ──
    if (isOwner || isSessionOwner) {
      const menu =
`╔══════════════════════════════╗
  🔧  P A N N E A U   A D M I N
╚══════════════════════════════╝

👥 *GESTION GROUPE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}kick @user\` — Exclure un membre
▸ \`${p}promote @user\` — Promouvoir admin
▸ \`${p}demote @user\` — Rétrograder admin
▸ \`${p}mute\` — Fermer le groupe
▸ \`${p}unmute\` — Ouvrir le groupe
▸ \`${p}warn @user [raison]\` — Avertir (3 = kick)
▸ \`${p}tagall [msg]\` — Mentionner tout le monde
▸ \`${p}rules\` — Afficher les règles

⚙️ *PARAMÈTRES*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ \`${p}welcome on/off\` — Message de bienvenue
▸ \`${p}goodbye on/off\` — Message de départ
▸ \`${p}antigroup\` — Protections du groupe
▸ \`${p}mode public/private/group\` — Mode du bot

— *${config.botName}*`

      try {
        const imgBuffer = fs.readFileSync(path.join(__dirname, '../../assets/adminmenu.jpg'))
        return await sock.sendMessage(jid, { image: imgBuffer, caption: menu }, { quoted: msg })
      } catch {
        return await sock.sendMessage(jid, { text: menu }, { quoted: msg })
      }
    }

    // ── Utilisateur lambda : refus ──────────────────────────────
    await sock.sendMessage(jid, {
      text: `Tu peux pas me donner des ordres. Sais-tu seulement qui je suis ?\n\n— *${config.botName}*`
    }, { quoted: msg })
  }
}