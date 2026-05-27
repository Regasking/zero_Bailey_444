import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const botPatterns = [/^3EB0/,/^4EB0/,/^5EB0/,/^BAE5/,/^BAE7/,/^CAEB0/]

async function getState(jid) {
  try { return await redis.get(`antibot:${jid}`) || null } catch { return null }
}
async function setState(jid, val) {
  try { if (val) await redis.set(`antibot:${jid}`, val); else await redis.del(`antibot:${jid}`) } catch {}
}
async function getWarns(jid, sender) {
  try { return parseInt(await redis.get(`antibot:warn:${jid}:${sender}`) || 0) } catch { return 0 }
}
async function setWarns(jid, sender, n) {
  try { if (n > 0) await redis.set(`antibot:warn:${jid}:${sender}`, n, { ex: 86400 }); else await redis.del(`antibot:warn:${jid}:${sender}`) } catch {}
}

export default {
  name: 'antibot',
  alias: ['anti-bot'],
  desc: 'Protection anti-bots dans le groupe',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const action = args[0]?.toLowerCase()
    const p = config.prefix

    if (!['on','off','delete','warn','kick','status'].includes(action)) {
      return sock.sendMessage(jid, { text:
`🤖 *ANTIBOT*\n\n▸ \`${p}antibot on\` — Activer (mode warn)\n▸ \`${p}antibot off\` — Désactiver\n▸ \`${p}antibot delete\` — Supprimer les msgs bots\n▸ \`${p}antibot warn\` — 3 avertissements = kick\n▸ \`${p}antibot kick\` — Kick instantané\n▸ \`${p}antibot status\` — Voir le statut\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'status') {
      const state = await getState(jid)
      return sock.sendMessage(jid, { text: state
        ? `✅ Antibot ACTIVÉ\n📊 Mode : ${state.toUpperCase()}`
        : `❌ Antibot désactivé.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'off') {
      await setState(jid, null)
      return sock.sendMessage(jid, { text: `❌ Antibot désactivé.\n\n— *${config.botName}*` }, { quoted: msg })
    }

    const mode = action === 'on' ? 'warn' : action
    await setState(jid, mode)
    return sock.sendMessage(jid, { text: `✅ Antibot activé — Mode *${mode.toUpperCase()}*\n\n— *${config.botName}*` }, { quoted: msg })
  },

  // Appelé sur chaque message du groupe
  async detect(sock, msg) {
    try {
      const jid = msg.key.remoteJid
      if (!jid?.endsWith('@g.us') || msg.key.fromMe) return

      const state = await getState(jid)
      if (!state) return

      const sender = msg.key.participant || msg.key.remoteJid
      const meta = await sock.groupMetadata(jid).catch(() => null)
      if (!meta) return

      const botJid = sock.user.id.includes('@') ? sock.user.id : `${sock.user.id}@s.whatsapp.net`
      const botMember = meta.participants.find(p => p.id === botJid)
      if (!botMember?.admin) return

      const senderMeta = meta.participants.find(p => p.id === sender)
      if (senderMeta?.admin) return

      // Détection : name pattern ou flood de messages
      const pushName = msg.pushName || ''
      const isBotName = botPatterns.some(p => p.test(pushName))
      const isProtocolMsg = !!(msg.message?.protocolMessage || msg.message?.reactionMessage)
      if (!isBotName && !isProtocolMsg) return

      // Supprimer le message
      try { await sock.sendMessage(jid, { delete: msg.key }) } catch {}

      if (state === 'kick') {
        await sock.groupParticipantsUpdate(jid, [sender], 'remove')
      } else if (state === 'warn') {
        const warns = await getWarns(jid, sender) + 1
        await setWarns(jid, sender, warns)
        if (warns >= 3) {
          await setWarns(jid, sender, 0)
          await sock.groupParticipantsUpdate(jid, [sender], 'remove')
        } else {
          await sock.sendMessage(jid, {
            text: `⚠️ @${sender.split('@')[0]} — Bot détecté. Avertissement ${warns}/3`,
            mentions: [sender]
          })
        }
      }
    } catch {}
  }
}
