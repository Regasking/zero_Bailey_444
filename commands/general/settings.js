import { config } from '../../config.js'
import { setUserLang, getUserLang, availableLangs } from '../../utils/i18n.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const SETTINGS_TTL = 60 * 60 * 24 * 30 // 30 jours

// ─── Helpers Redis ─────────────────────────────────────────────────────────
export async function getUserSettings(jid) {
  try {
    const data = await redis.get(`settings:${jid}`)
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : {}
  } catch {
    return {}
  }
}

async function saveUserSettings(jid, settings) {
  try {
    await redis.set(`settings:${jid}`, JSON.stringify(settings), { ex: SETTINGS_TTL })
  } catch {}
}

// ─── Commande ──────────────────────────────────────────────────────────────
export default {
  name: 'settings',
  alias: ['parametres', 'préférences', 'prefs'],
  desc: 'Tes préférences personnelles (langue, etc.)',
  category: 'general',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid

    // ── .settings lang <code> ──────────────────────────────────────────
    if (args[0]?.toLowerCase() === 'lang') {
      const code = args[1]?.toLowerCase()

      if (!code || !availableLangs.includes(code)) {
        return sock.sendMessage(jid, {
          text: `🌐 *Langues disponibles :*\n${availableLangs.join(', ')}\n\n*Utilisation :* ${config.prefix}settings lang <code>\n*Exemple :* ${config.prefix}settings lang en`
        })
      }

      setUserLang(senderJid, code)
      const settings = await getUserSettings(senderJid)
      settings.lang = code
      await saveUserSettings(senderJid, settings)

      const langNames = { fr: 'Français', en: 'English', es: 'Español', pt: 'Português', ht: 'Kreyòl' }

      return sock.sendMessage(jid, {
        text: `✅ Langue changée en *${langNames[code] || code}*.\n\n— *${config.botName}*`
      })
    }

    // ── Afficher les paramètres actuels ───────────────────────────────
    const settings = await getUserSettings(senderJid)
    const currentLang = getUserLang(senderJid)
    const langNames = { fr: 'Français 🇫🇷', en: 'English 🇬🇧', es: 'Español 🇪🇸', pt: 'Português 🇧🇷', ht: 'Kreyòl 🇭🇹' }

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  ⚙️  S E T T I N G S\n╚══════════════════════╝\n\n👤 @${senderJid.split('@')[0]}\n\n🌐 *Langue :* ${langNames[currentLang] || currentLang}\n\n━━━━━━━━━━━━━━━━━━━━━\n*Commandes :*\n▸ ${config.prefix}settings lang <code> — Changer de langue\n\n*Langues dispo :* ${availableLangs.join(', ')}\n\n— *${config.botName}*`,
      mentions: [senderJid]
    })
  }
}
