import { config } from '../../config.js'
import { personality } from '../../utils/personality.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Stocker l'ID du dernier message menu par conv
export const menuMessages = new Map()

const subMenus = {
  '1': `⚙️ *GÉNÉRAL*
━━━━━━━━━━━━━━━━━━━━━
▸ ${config.prefix}ping — Latence
▸ ${config.prefix}alive — Status
▸ ${config.prefix}botinfo — Infos du bot
▸ ${config.prefix}id — Ton ID WhatsApp
▸ ${config.prefix}time — Heure actuelle
▸ ${config.prefix}settings — Préférences
▸ ${config.prefix}getbot — Obtenir ce bot`,

  '2': `👥 *GROUPE*
━━━━━━━━━━━━━━━━━━━━━
▸ ${config.prefix}tagall — Tag tout le monde
▸ ${config.prefix}kick — Exclure un membre
▸ ${config.prefix}promote — Promouvoir admin
▸ ${config.prefix}demote — Rétrograder admin
▸ ${config.prefix}mute — Fermer le groupe
▸ ${config.prefix}unmute — Ouvrir le groupe
▸ ${config.prefix}warn — Avertir (3 = kick)
▸ ${config.prefix}rules — Règles du groupe
▸ ${config.prefix}poll — Créer un sondage
▸ ${config.prefix}groupinfo — Infos du groupe
▸ ${config.prefix}welcome — Bienvenue on/off
▸ ${config.prefix}goodbye — Sortie on/off\n▸ ${config.prefix}antigroup — Protections du groupe`,

  '3': `🎵 *MÉDIA & IA*
━━━━━━━━━━━━━━━━━━━━━
▸ ${config.prefix}song — Musique MP3
▸ ${config.prefix}csong — Envoyer musique vers channel
▸ ${config.prefix}lyrics — Paroles d'une chanson
▸ ${config.prefix}ai — Parler à l'IA
▸ ${config.prefix}translate — Traduire un texte
▸ ${config.prefix}ocr — Lire texte sur image`,

  '4': `🎮 *GAMES*
━━━━━━━━━━━━━━━━━━━━━
▸ ${config.prefix}joke — Blague
▸ ${config.prefix}ship — Compatibilité
▸ ${config.prefix}8ball — Boule magique
▸ ${config.prefix}dare — Action ou Vérité
▸ ${config.prefix}trivia — Quiz rapide
▸ ${config.prefix}quiz — Quiz IA (thème + difficulté)
▸ ${config.prefix}rank — Ton niveau XP
▸ ${config.prefix}leaderboard — Classement`,

  '5': `🛠️ *OUTILS*
━━━━━━━━━━━━━━━━━━━━━
▸ ${config.prefix}sticker — Créer un sticker
▸ ${config.prefix}vv — Anti view-once
▸ ${config.prefix}tts — Texte en vocal
▸ ${config.prefix}weather — Météo
▸ ${config.prefix}calc — Calculatrice
▸ ${config.prefix}qr — Générer QR Code
▸ ${config.prefix}getpp — Photo de profil
▸ ${config.prefix}translate — Traduire`,

  '6': `👑 *OWNER*
━━━━━━━━━━━━━━━━━━━━━
▸ ${config.prefix}broadcast — Message général
▸ ${config.prefix}eval — Exécuter du code
▸ ${config.prefix}maintenance — Mode maintenance
▸ ${config.prefix}mode — Mode public/privé
▸ ${config.prefix}restart — Redémarrer le bot
▸ ${config.prefix}sudo — Ajouter un sudo`
}

export const mainMenu = (date, heure, isOwner, prefix) => `⚡ 𝒁𝑬𝑹𝑶_𝑩𝑨𝑰𝑳𝑬𝒀_𝟒 𝟒 𝟒 ⚡
𝑻𝒉𝒆 𝑳𝒊𝒐𝒏'𝒔 𝑺𝒊𝒏 𝑶𝒇 𝑷𝒓𝒊𝒅𝒆

👤 𝕽𝖊𝖌𝖆𝖘_𝖐𝖎𝖓𝖌 𝖉𝖙𝖍 & 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」
📅 ${date} — ⏰ ${heure}

━━━━━━━━━━━━━━━━━━━━━
*Sélectionne une catégorie :*
━━━━━━━━━━━━━━━━━━━━━
1️⃣ — ⚙️ Général
2️⃣ — 👥 Groupe
3️⃣ — 🎵 Média & IA
4️⃣ — 🎮 Games
5️⃣ — 🛠️ Outils${isOwner ? '\n6️⃣ — 👑 Owner' : ''}
━━━━━━━━━━━━━━━━━━━━━
_Reply à ce message avec un chiffre_
_𝘊𝘰𝘯𝘴𝘵𝘳𝘶𝘪𝘵 𝘱𝘢𝘳 𝘭𝘦𝘴 𝘮𝘦𝘪𝘭𝘭𝘦𝘶𝘳𝘴._`

export default {
  name: 'menu',
  alias: ['help'],
  desc: 'Affiche le menu',
  category: 'general',

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    const now = new Date()
    const heure = now.toLocaleTimeString('fr-FR')
    const date = now.toLocaleDateString('fr-FR')

    // Si reply avec un chiffre → afficher sous-menu
    const quoted = msg.message?.extendedTextMessage?.contextInfo
    const repliedId = quoted?.stanzaId
    const stored = menuMessages.get(jid)

    if (repliedId && stored?.id === repliedId && args[0] && subMenus[args[0]]) {
      return sock.sendMessage(jid, {
        text: subMenus[args[0]]
      }, { quoted: msg })
    }

    const menuText = mainMenu(date, heure, isOwner, config.prefix)
    const imagePath = path.join(__dirname, '../../assets/escanor.jpg')

    let sentMsg

    if (fs.existsSync(imagePath)) {
      sentMsg = await sock.sendMessage(jid, {
        image: fs.readFileSync(imagePath),
        caption: menuText
      }, { quoted: msg })
    } else {
      sentMsg = await sock.sendMessage(jid, {
        text: menuText
      }, { quoted: msg })
    }

    // Stocker l'ID du message menu
    if (sentMsg?.key?.id) {
      menuMessages.set(jid, {
        id: sentMsg.key.id,
        isOwner,
        timestamp: Date.now()
      })
    }
  }
}