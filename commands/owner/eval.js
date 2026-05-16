import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { Redis } from '@upstash/redis'
import vm from 'vm'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const AUDIT_TTL = 60 * 60 * 24 * 30 // 30 jours

// ─── Commandes dangereuses bloquées ────────────────────────────
const BLACKLIST = [
  'process.exit', 'process.kill', 'child_process', 'exec(', 'spawn(',
  'fs.rmSync', 'fs.unlinkSync', 'fs.writeFileSync', 'fs.rmdirSync',
  '__dirname', 'require(', 'import(', 'eval(', 'Function(',
  'redis.flushall', 'redis.flushdb', '.env',
]

// ─── Log audit Redis ────────────────────────────────────────────
async function logAudit(senderJid, code, result) {
  try {
    const entry = {
      sender: senderJid,
      code,
      result: String(result).slice(0, 200),
      date: new Date().toISOString()
    }
    const key = `audit:eval:${Date.now()}`
    await redis.set(key, JSON.stringify(entry), { ex: AUDIT_TTL })
  } catch {}
}

export default {
  name: 'eval',
  alias: ['exec', 'run'],
  desc: 'Exécuter du code JS (owner uniquement)',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    // Double vérification stricte — pas seulement isOwner du handler
    const senderNum = senderJid.split('@')[0].split(':')[0]
    const isHardOwner = config.owners.some(
      o => o.number.split('@')[0].split(':')[0] === senderNum
        || (o.lid && o.lid.split('@')[0].split(':')[0] === senderNum)
    )

    if (!isOwner || !isHardOwner) {
      await logAudit(senderJid, args.join(' '), 'ACCÈS REFUSÉ')
      return sock.sendMessage(jid, {
        text: `🚫 Accès refusé.\n\n— *${config.botName}*`
      })
    }

    const code = args.join(' ')
    if (!code) {
      return sock.sendMessage(jid, {
        text: `*Utilisation :* ${config.prefix}eval <code JS>`
      })
    }

    // Vérification blacklist
    const blocked = BLACKLIST.find(b => code.includes(b))
    if (blocked) {
      await logAudit(senderJid, code, `BLOQUÉ: ${blocked}`)
      return sock.sendMessage(jid, {
        text: `🚫 Code bloqué — *"${blocked}"* est interdit.\n\n— *${config.botName}*`
      })
    }

    try {
      // Sandbox VM — isolé du contexte global
      const sandbox = {
        config: { botName: config.botName, prefix: config.prefix }, // config limité
        console: { log: (...a) => a.join(' ') },
        Date,
        Math,
        JSON,
        String,
        Number,
        Array,
        Object,
        result: undefined,
      }

      const script = new vm.Script(`result = (async () => { ${code} })()`)
      const ctx = vm.createContext(sandbox)

      // Timeout 5 secondes max
      script.runInContext(ctx, { timeout: 5000 })
      let result = await sandbox.result
      if (typeof result !== 'string') result = JSON.stringify(result, null, 2)

      await logAudit(senderJid, code, result)

      await sock.sendMessage(jid, {
        text: `✅ *Résultat :*\n\`\`\`${String(result).slice(0, 1000)}\`\`\`\n\n— *${config.botName}*`
      })

    } catch (err) {
      await logAudit(senderJid, code, `ERREUR: ${err.message}`)
      await sock.sendMessage(jid, {
        text: `❌ *Erreur :*\n\`\`\`${err.message}\`\`\`\n\n— *${config.botName}*`
      })
    }
  }
}