import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

async function getState(jid) {
  try { return await redis.get(`antitag:${jid}`) || null } catch { return null }
}
async function setState(jid, val) {
  try { if (val) await redis.set(`antitag:${jid}`, val); else await redis.del(`antitag:${jid}`) } catch {}
}

export default {
  name: 'antitag',
  alias: ['anti-tag'],
  desc: 'Bloque les tagall et mentions massives',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const action = args[0]?.toLowerCase()
    const p = config.prefix

    if (!['on','off','delete','kick','status'].includes(action)) {
      return sock.sendMessage(jid, { text:
`🏷️ *ANTITAG*\n\n▸ \`${p}antitag on\` — Activer (mode delete)\n▸ \`${p}antitag off\` — Désactiver\n▸ \`${p}antitag kick\` — Kick direct\n▸ \`${p}antitag status\` — Voir le statut\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'status') {
      const state = await getState(jid)
      return sock.sendMessage(jid, { text: state
        ? `✅ Antitag ACTIVÉ\n📊 Mode : ${state.toUpperCase()}`
        : `❌ Antitag désactivé.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'off') {
      await setState(jid, null)
      return sock.sendMessage(jid, { text: `❌ Antitag désactivé.\n\n— *${config.botName}*` }, { quoted: msg })
    }

    const mode = ['kick'].includes(action) ? action : 'delete'
    await setState(jid, mode)
    return sock.sendMessage(jid, { text: `✅ Antitag activé — Mode *${mode.toUpperCase()}*\n\n— *${config.botName}*` }, { quoted: msg })
  },

  async detect(sock, msg) {
    try {
      const jid = msg.key.remoteJid
      if (!jid?.endsWith('@g.us') || msg.key.fromMe) return

      const state = await getState(jid)
      if (!state) return

      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
      if (mentions.length === 0 && !/@all/i.test(body)) return

      const sender = msg.key.participant || msg.key.remoteJid
      const meta = await sock.groupMetadata(jid).catch(() => null)
      if (!meta) return

      const senderMeta = meta.participants.find(p => p.id === sender)
      if (senderMeta?.admin) return

      try { await sock.sendMessage(jid, { delete: msg.key }) } catch {}

      if (state === 'kick') {
        await sock.groupParticipantsUpdate(jid, [sender], 'remove')
      }
    } catch {}
  }
}
