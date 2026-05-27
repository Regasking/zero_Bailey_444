import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const MESSAGE_LIMIT = 6
const TIME_WINDOW = 5000
const spamTracker = new Map()

async function getState(jid) {
  try { return !!(await redis.get(`antispam:${jid}`)) } catch { return false }
}
async function setState(jid, val) {
  try { if (val) await redis.set(`antispam:${jid}`, 1); else await redis.del(`antispam:${jid}`) } catch {}
}

export default {
  name: 'antispam',
  alias: ['anti-spam'],
  desc: 'Anti-flood automatique dans le groupe',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const action = args[0]?.toLowerCase()
    const p = config.prefix

    if (!['on','off'].includes(action)) {
      const state = await getState(jid)
      return sock.sendMessage(jid, { text:
`🚫 *ANTISPAM*\n\n▸ \`${p}antispam on\` — Activer\n▸ \`${p}antispam off\` — Désactiver\n\n📊 Statut : ${state ? '✅ Activé' : '❌ Désactivé'}\n📨 Limite : ${MESSAGE_LIMIT} messages / ${TIME_WINDOW/1000}s\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'off') {
      await setState(jid, false)
      return sock.sendMessage(jid, { text: `❌ Antispam désactivé.\n\n— *${config.botName}*` }, { quoted: msg })
    }

    await setState(jid, true)
    return sock.sendMessage(jid, { text: `✅ Antispam activé — Flood détecté = kick automatique.\n\n— *${config.botName}*` }, { quoted: msg })
  },

  async detect(sock, msg) {
    try {
      const jid = msg.key.remoteJid
      if (!jid?.endsWith('@g.us') || msg.key.fromMe) return
      if (!await getState(jid)) return

      const sender = msg.key.participant || msg.key.remoteJid
      const meta = await sock.groupMetadata(jid).catch(() => null)
      if (!meta) return

      const senderMeta = meta.participants.find(p => p.id === sender)
      if (senderMeta?.admin) return

      const now = Date.now()
      const key = `${jid}:${sender}`
      const times = (spamTracker.get(key) || []).filter(t => now - t < TIME_WINDOW)
      times.push(now)
      spamTracker.set(key, times)

      if (times.length >= MESSAGE_LIMIT) {
        spamTracker.delete(key)
        try { await sock.sendMessage(jid, { delete: msg.key }) } catch {}
        await sock.groupParticipantsUpdate(jid, [sender], 'remove')
        await sock.sendMessage(jid, {
          text: `🚫 @${sender.split('@')[0]} expulsé pour flood.`,
          mentions: [sender]
        })
      }
    } catch {}
  }
}
