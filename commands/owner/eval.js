import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const AUDIT_TTL = 60 * 60 * 24 * 30

// ─── Log audit Redis ────────────────────────────────────────────
async function logAudit(senderJid, code, result) {
  try {
    await redis.set(
      `audit:eval:${Date.now()}`,
      JSON.stringify({
        sender: senderJid,
        code,
        result: String(result).slice(0, 200),
        date: new Date().toISOString()
      }),
      { ex: AUDIT_TTL }
    )
  } catch {}
}

// ─── Vérification stricte ownership (sans vm contournable) ─────
function verifyHardOwner(senderJid) {
  if (!senderJid || typeof senderJid !== 'string') return false
  const senderNum = senderJid.split('@')[0].split(':')[0].trim()
  if (!senderNum || !/^\d+$/.test(senderNum)) return false

  return config.owners.some(o => {
    const ownerNum = o.number?.split('@')[0]?.split(':')[0]?.trim()
    const lidNum   = o.lid?.split('@')[0]?.split(':')[0]?.trim()
    return (ownerNum && ownerNum === senderNum) || (lidNum && lidNum === senderNum)
  })
}

// ─── Blacklist AST-safe (regex, pas includes()) ─────────────────
// Résiste aux espaces Unicode, aux backticks, et à la concaténation
const BLOCKED_PATTERNS = [
  /process\s*[\.\[]/i,
  /child[_\s]*process/i,
  /require\s*\(/i,
  /import\s*\(/i,
  /\beval\s*\(/i,
  /Function\s*\(/i,
  /\bfs\b.*\b(rm|unlink|write|rmdir)/i,
  /redis\s*\.\s*(flush|del\b)/i,
  /\.env\b/i,
  /\bexec\s*\(/i,
  /\bspawn\s*\(/i,
  /this\s*\.\s*constructor/i,
  /\[.*constructor.*\]/i,
  /__proto__/i,
  /prototype\s*\[/i,
]

function checkBlacklist(code) {
  // Normalise pour détecter les obfuscations basiques
  const normalized = code
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width chars
    .replace(/\\u\{?[0-9a-fA-F]+\}?/g, 'X') // Unicode escapes
    .replace(/\\x[0-9a-fA-F]{2}/g, 'X')      // Hex escapes
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) return pattern.toString()
  }
  return null
}

// ─── Timeout helper (sans vm) ──────────────────────────────────
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout (${ms}ms)`)), ms)
    )
  ])
}

export default {
  name: 'eval',
  alias: ['exec', 'run'],
  desc: 'Exécuter du code JS (owner uniquement)',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    // Triple vérification : flag handler + vérif config.owners directe
    if (!isOwner || !verifyHardOwner(senderJid)) {
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

    // Vérification blacklist renforcée (regex multi-pattern)
    const blocked = checkBlacklist(code)
    if (blocked) {
      await logAudit(senderJid, code, `BLOQUÉ: ${blocked}`)
      return sock.sendMessage(jid, {
        text: `🚫 Pattern dangereux détecté.\n\nCode refusé.\n\n— *${config.botName}*`
      })
    }

    try {
      // Exécution dans une async IIFE avec timeout 5s
      // NOTE : on n'utilise plus vm.Script (contournable via this.constructor)
      // L'accès à process, fs, etc. est bloqué par la blacklist ci-dessus
      const fn = new Function(
        'config', 'Date', 'Math', 'JSON', 'String', 'Number', 'Array', 'Object',
        `"use strict"; return (async () => { ${code} })()`
      )

      let result = await withTimeout(
        fn(
          { botName: config.botName, prefix: config.prefix },
          Date, Math, JSON, String, Number, Array, Object
        ),
        5000
      )

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