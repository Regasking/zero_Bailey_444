import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const DEFAULT_BADWORDS = ['fuck','bitch','asshole','nigga','shit','merde','connard','salaud','putain','enfoiré','fdp','batard','bâtard']

async function getState(jid) {
  try { return await redis.get(`antibadword:${jid}`) || null } catch { return null }
}
async function setState(jid, val) {
  try { if (val) await redis.set(`antibadword:${jid}`, val); else await redis.del(`antibadword:${jid}`) } catch {}
}
async function getWarns(jid, sender) {
  try { return parseInt(await redis.get(`antibadword:warn:${jid}:${sender}`) || 0) } catch { return 0 }
}
async function setWarns(jid, sender, n) {
  try { if (n > 0) await redis.set(`antibadword:warn:${jid}:${sender}`, n, { ex: 86400 }); else await redis.del(`antibadword:warn:${jid}:${sender}`) } catch {}
}

export default {
  name: 'antibadword',
  alias: ['antibad', 'antiinsult'],
  desc: 'Filtre les mots interdits dans le groupe',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const action = args[0]?.toLowerCase()
    const p = config.prefix

    if (!['on','off','delete','warn','kick','status'].includes(action)) {
      return sock.sendMessage(jid, { text:
`🤬 *ANTIBADWORD*\n\n▸ \`${p}antibadword on\` — Activer (mode delete)\n▸ \`${p}antibadword off\` — Désactiver\n▸ \`${p}antibadword warn\` — 3 avertissements = kick\n▸ \`${p}antibadword kick\` — Kick direct\n▸ \`${p}antibadword status\` — Voir le statut\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'status') {
      const state = await getState(jid)
      return sock.sendMessage(jid, { text: state
        ? `✅ Antibadword ACTIVÉ\n📊 Mode : ${state.toUpperCase()}`
        : `❌ Antibadword désactivé.\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'off') {
      await setState(jid, null)
      return sock.sendMessage(jid, { text: `❌ Antibadword désactivé.\n\n— *${config.botName}*` }, { quoted: msg })
    }

    const mode = action === 'on' ? 'delete' : action
    await setState(jid, mode)
    return sock.sendMessage(jid, { text: `✅ Antibadword activé — Mode *${mode.toUpperCase()}*\n\n— *${config.botName}*` }, { quoted: msg })
  },

  async detect(sock, msg) {
    try {
      const jid = msg.key.remoteJid
      if (!jid?.endsWith('@g.us') || msg.key.fromMe) return

      const state = await getState(jid)
      if (!state) return

      const body = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').toLowerCase()
      if (!DEFAULT_BADWORDS.some(w => body.includes(w))) return

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
        if (warns >= 3) {
          await setWarns(jid, sender, 0)
          await sock.groupParticipantsUpdate(jid, [sender], 'remove')
        } else {
          await sock.sendMessage(jid, {
            text: `⚠️ @${sender.split('@')[0]} — Langage interdit. Avertissement ${warns}/3`,
            mentions: [sender]
          })
        }
      } else {
        await sock.sendMessage(jid, {
          text: `🤬 @${sender.split('@')[0]} — Les mots interdits ne sont pas tolérés ici.`,
          mentions: [sender]
        })
      }
    } catch {}
  }
}
