import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

async function getState(jid) {
  try { return !!(await redis.get(`antistatus:${jid}`)) } catch { return false }
}
async function setState(jid, val) {
  try { if (val) await redis.set(`antistatus:${jid}`, 1); else await redis.del(`antistatus:${jid}`) } catch {}
}

export default {
  name: 'antistatus',
  alias: ['anti-status'],
  desc: 'Supprime les mentions de statuts dans le groupe',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const action = args[0]?.toLowerCase()
    const p = config.prefix

    if (!['on','off','status'].includes(action)) {
      const state = await getState(jid)
      return sock.sendMessage(jid, { text:
`📌 *ANTISTATUS*\n\n▸ \`${p}antistatus on\` — Activer\n▸ \`${p}antistatus off\` — Désactiver\n▸ \`${p}antistatus status\` — Voir le statut\n\n📊 Statut : ${state ? '✅ Activé' : '❌ Désactivé'}\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'status') {
      const state = await getState(jid)
      return sock.sendMessage(jid, { text: `📌 Antistatus : *${state ? 'ACTIVÉ ✅' : 'DÉSACTIVÉ ❌'}*\n\n— *${config.botName}*` }, { quoted: msg })
    }

    const enable = action === 'on'
    await setState(jid, enable)
    return sock.sendMessage(jid, { text: `${enable ? '✅ Antistatus activé.' : '❌ Antistatus désactivé.'}\n\n— *${config.botName}*` }, { quoted: msg })
  },

  async detect(sock, msg) {
    try {
      const jid = msg.key.remoteJid
      if (!jid?.endsWith('@g.us') || msg.key.fromMe) return
      if (!await getState(jid)) return
      if (!msg.message?.protocolMessage && !msg.message?.reactionMessage) return

      const meta = await sock.groupMetadata(jid).catch(() => null)
      if (!meta) return

      const botJid = sock.user.id.includes('@') ? sock.user.id : `${sock.user.id}@s.whatsapp.net`
      const botMember = meta.participants.find(p => p.id === botJid)
      if (!botMember?.admin) return

      const sender = msg.key.participant || msg.key.remoteJid
      const senderMeta = meta.participants.find(p => p.id === sender)
      if (senderMeta?.admin) return

      try { await sock.sendMessage(jid, { delete: msg.key }) } catch {}
    } catch {}
  }
}
