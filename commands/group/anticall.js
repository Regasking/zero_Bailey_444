import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

async function getState() {
  try { return !!(await redis.get('anticall:enabled')) } catch { return false }
}
async function setState(val) {
  try { if (val) await redis.set('anticall:enabled', 1); else await redis.del('anticall:enabled') } catch {}
}

export default {
  name: 'anticall',
  alias: ['anti-call'],
  desc: 'Bloquer automatiquement les appels entrants',
  category: 'group',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const action = args[0]?.toLowerCase()
    const p = config.prefix

    if (!['on','off','status'].includes(action)) {
      const state = await getState()
      return sock.sendMessage(jid, { text:
`📵 *ANTICALL*\n\n▸ \`${p}anticall on\` — Activer\n▸ \`${p}anticall off\` — Désactiver\n▸ \`${p}anticall status\` — Voir le statut\n\n📊 Statut actuel : ${state ? '✅ Activé' : '❌ Désactivé'}\n\n— *${config.botName}*`
      }, { quoted: msg })
    }

    if (action === 'status') {
      const state = await getState()
      return sock.sendMessage(jid, { text: `📵 Anticall : *${state ? 'ACTIVÉ ✅' : 'DÉSACTIVÉ ❌'}*\n\n— *${config.botName}*` }, { quoted: msg })
    }

    const enable = action === 'on'
    await setState(enable)
    return sock.sendMessage(jid, { text: `${enable ? '✅ Anticall activé — Les appels seront automatiquement rejetés.' : '❌ Anticall désactivé.'}\n\n— *${config.botName}*` }, { quoted: msg })
  }
}
