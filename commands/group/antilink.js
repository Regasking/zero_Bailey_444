import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me)/i

async function getState(jid) {
  try { return await redis.get(`antilink:${jid}`) || null } catch { return null }
}
async function setState(jid, val) {
  try { if (val) await redis.set(`antilink:${jid}`, val); else await redis.del(`antilink:${jid}`) } catch {}
}
async function getWarns(jid, sender) {
  try { return parseInt(await redis.get(`antilink:warn:${jid}:${sender}`) || 0) } catch { return 0 }
}
async function setWarns(jid, sender, n) {
  try { if (n > 0) await redis.set(`antilink:warn:${jid}:${sender}`, n, { ex: 86400 }); else await redis.del(`antilink:warn:${jid}:${sender}`) } catch {}
}

export default {
  name: 'antilink',
  alias: ['anti-link'],
  desc: 'Anti-lien avec modes delete / warn / kick',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const action = args[0]?.toLowerCase()
    const p = config.prefix

    if (!['on','off','delete','warn','kick','status'].includes(action)) {
      return sock.sendMessage(jid, { text:
`🔗 *ANTILINK*\n\n▸ \`${p}antilink on\` — Activer (mode warn)\n▸ \`${p}antilink off\` — Désactiver\n▸ \`${p}antilink delete\` — Supprimer le lien\n▸ \`${p}antilink warn\` — 4 avertissements = kick\n▸ \`${p}antilink kick\` — Kick direct\n▸ \`${p}antilink status\` — Voir le statut\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'status') {
      const state = await getState(jid)
      return sock.sendMessage(jid, { text: state
        ? `✅ Antilink ACTIVÉ\n📊 Mode : ${state.toUpperCase()}`
        : `❌ Antilink désactivé.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'off') {
      await setState(jid, null)
      return sock.sendMessage(jid, { text: `❌ Antilink désactivé.\n\n— *${config.botName}*` }, { quoted: msg })
    }

    const mode = action === 'on' ? 'warn' : action
    await setState(jid, mode)
    return sock.sendMessage(jid, { text: `✅ Antilink activé — Mode *${mode.toUpperCase()}*\n\n— *${config.botName}*` }, { quoted: msg })
  },

  async detect(sock, msg) {
    try {
      const jid = msg.key.remoteJid
      if (!jid?.endsWith('@g.us') || msg.key.fromMe) return

      const state = await getState(jid)
      if (!state) return

      const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
      if (!LINK_REGEX.test(body)) return

      const sender = msg.key.participant || msg.key.remoteJid
      const meta = await sock.groupMetadata(jid).catch(() => null)
      if (!meta) return

      const senderMeta = meta.participants.find(p => p.id === sender)
      if (senderMeta?.admin) return

      try { await sock.sendMessage(jid, { delete: msg.key }) } catch {}

      if (state === 'kick') {
        await sock.groupParticipantsUpdate(jid, [sender], 'remove')
      } else if (state === 'warn') {
        const warns = await getWarns(jid, sender) + 1
        await setWarns(jid, sender, warns)
        if (warns >= 4) {
          await setWarns(jid, sender, 0)
          await sock.groupParticipantsUpdate(jid, [sender], 'remove')
        } else {
          await sock.sendMessage(jid, {
            text: `⚠️ @${sender.split('@')[0]} — Lien détecté. Avertissement ${warns}/4`,
            mentions: [sender]
          })
        }
      }
    } catch {}
  }
}
