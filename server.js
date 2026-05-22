import { personality } from './utils/personality.js'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from 'baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import fs from 'fs'
import { Redis } from '@upstash/redis'
import { loadCommands, setStore } from './handlers/messageHandler.js'
import { handleEvents } from './handlers/eventHandler.js'
import { config } from './config.js'

// ═══════════ VALIDATION DES ENV VARS AU DÉMARRAGE ═══════════
const REQUIRED_ENV = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'OWNER1_NUMBER',
]
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k])
if (missingEnv.length) {
  console.error(`[BOOT] Variables manquantes : ${missingEnv.join(', ')}`)
  process.exit(1)
}

// ═══════════ LOGGER STRUCTURÉ ═══════════
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const httpServer = createServer(app)

// ═══════════ CORS RESTREINT ═══════════
const io = new Server(httpServer, {
  cors: { origin: '*', credentials: false }
})

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '1mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// ═══════════ RATE LIMITING API ═══════════
const apiRateLimits = new Map()
const API_WINDOW_MS = 60 * 1000
const API_MAX_REQ   = 30

function apiRateLimit(req, res, next) {
  const ip  = req.ip || 'unknown'
  const now = Date.now()
  const rec = apiRateLimits.get(ip)
  if (!rec || now > rec.resetAt) {
    apiRateLimits.set(ip, { count: 1, resetAt: now + API_WINDOW_MS })
    return next()
  }
  if (rec.count >= API_MAX_REQ) {
    return res.status(429).json({ success: false, error: 'Trop de requêtes' })
  }
  rec.count++
  next()
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, rec] of apiRateLimits) {
    if (now > rec.resetAt) apiRateLimits.delete(ip)
  }
}, 5 * 60 * 1000)

// ═══════════ AUTH MIDDLEWARE (désactivé — hébergement public Railway) ═══════════
function requireAuth(req, res, next) {
  next()
}

// ═══════════ CHIFFREMENT DES SESSIONS ═══════════
const CIPHER_KEY = Buffer.from(
  (process.env.SESSION_CIPHER_KEY || 'zero_bailey_default_key_railway!!').trim().padEnd(32, '0').slice(0, 32)
)
const CIPHER_ALG  = 'aes-256-cbc'

function encryptSession(data) {
  const iv  = crypto.randomBytes(16)
  const enc = crypto.createCipheriv(CIPHER_ALG, CIPHER_KEY, iv)
  const buf  = Buffer.concat([enc.update(data, 'utf8'), enc.final()])
  return iv.toString('hex') + ':' + buf.toString('hex')
}

function decryptSession(data) {
  const [ivHex, encHex] = data.split(':')
  const iv  = Buffer.from(ivHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const dec = crypto.createDecipheriv(CIPHER_ALG, CIPHER_KEY, iv)
  return Buffer.concat([dec.update(enc), dec.final()]).toString('utf8')
}

// ═══════════ REDIS CLIENT ═══════════
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

// ═══════════ SESSIONS (chiffrées) ═══════════

async function saveSession(sessionId, sessionPath, phone) {
  try {
    if (!fs.existsSync(sessionPath)) return
    const files = fs.readdirSync(sessionPath)
    const creds = {}
    for (const file of files) {
      creds[file] = fs.readFileSync(path.join(sessionPath, file), 'utf8')
    }
    creds['__phone__'] = phone
    const encrypted = encryptSession(JSON.stringify(creds))
    await redis.set(`session:${sessionId}`, encrypted)
    logger.info({ sessionId }, '[Redis] Session sauvegardée (chiffrée)')
  } catch (err) {
    logger.error({ err: err.message }, '[Redis] Erreur save session')
  }
}

async function loadSession(sessionId, sessionPath) {
  try {
    const data = await redis.get(`session:${sessionId}`)
    if (!data) return false
    const raw = typeof data === 'string' ? data : JSON.stringify(data)

    let creds
    try {
      creds = JSON.parse(decryptSession(raw))
    } catch {
      creds = typeof data === 'string' ? JSON.parse(data) : data
    }

    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })
    for (const [file, content] of Object.entries(creds)) {
      if (file !== '__phone__') fs.writeFileSync(path.join(sessionPath, file), content)
    }
    logger.info({ sessionId }, '[Redis] Session rechargée')
    return true
  } catch (err) {
    logger.error({ err: err.message }, '[Redis] Erreur load session')
    return false
  }
}

async function deleteSession(sessionId) {
  try {
    await redis.del(`session:${sessionId}`)
    logger.info({ sessionId }, '[Redis] Session supprimée')
  } catch (err) {
    logger.error({ err: err.message }, '[Redis] Erreur delete session')
  }
}

const sessions = new Map()
const reconnectAttempts = new Map() // compteur tentatives par session
const reconnectTimers = new Map()   // keepalive intervals par session

// ═══════════ CRÉATION SOCKET ═══════════

async function createSocket(sessionId, cleanPhone) {
  const sessionPath = `./sessions/${sessionId}`
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

  await loadSession(sessionId, sessionPath)

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Chrome'),
    syncFullHistory: false,
    getMessage: async (key) => {
      const session = sessions.get(sessionId)
      return session?.store?.get(key.id) || { conversation: '' }
    }
  })

  const store = new Map()
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key?.id) store.set(msg.key.id, msg)
    }
  })

  let pairingRequested = false

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'connecting' && !sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(cleanPhone.trim())
          io.to(sessionId).emit('pairingCode', { code })
          logger.info({ sessionId }, '[Socket] Pairing code envoyé')
        } catch (err) {
          io.to(sessionId).emit('error', { message: 'Erreur pairing: ' + err.message })
        }
      }, 5000)
    }

    if (connection === 'open') {
      const botNumber    = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
      const connectedLid = sock.user?.lid?.split(':')[0] + '@lid'
      // LID réel du propriétaire de cette session (celui qui a scanné le QR)
      const ownerLid     = sock.user?.lid?.split(':')[0]?.split('@')[0]?.trim()
      const ownerPhone   = cleanPhone?.replace(/\D/g, '')

      if (sessions.has(sessionId)) {
        const session = sessions.get(sessionId)
        session.connected  = true
        session.sock       = sock
        session.store      = store
        session.ownerLid   = ownerLid   // LID réel stocké à la connexion
        session.ownerPhone = ownerPhone
        setStore(store)
      }

      // NOTE : dynamicOwner sert uniquement pour les messages système
      // Il N'EST PAS utilisé dans isOwner() — seuls config.owners est authorité
      config.dynamicOwner = botNumber
      config.connectedLid = connectedLid

      // Keepalive — ping toutes les 25 min pour éviter le timeout Railway
      reconnectAttempts.delete(sessionId)
      if (reconnectTimers.has(sessionId)) clearInterval(reconnectTimers.get(sessionId))
      const keepalive = setInterval(() => {
        try { sock.sendPresenceUpdate('available') } catch {}
      }, 25 * 60 * 1000)
      reconnectTimers.set(sessionId, keepalive)

      logger.info({ sessionId, botNumber }, '✅ Connecté')
      io.to(sessionId).emit('connected', { number: botNumber, name: sock.user?.name })

      setTimeout(async () => {
        try {
          await sock.sendMessage(cleanPhone + '@s.whatsapp.net', {
            text: personality.getWelcomeMessage(config.botName)
          })
        } catch (err) {
          logger.error({ err: err.message }, 'Erreur message bienvenue')
        }
      }, 5000)
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      logger.warn({ sessionId, code }, '❌ Déconnecté')

      // Nettoyer le keepalive
      if (reconnectTimers.has(sessionId)) {
        clearInterval(reconnectTimers.get(sessionId))
        reconnectTimers.delete(sessionId)
      }

      if (code === DisconnectReason.loggedOut) {
        // Session expirée — pas de reconnexion
        await deleteSession(sessionId)
        sessions.delete(sessionId)
        io.to(sessionId).emit('disconnected')
        logger.warn({ sessionId }, '🔒 Session expirée — reconnexion manuelle requise')
      } else {
        // Déconnexion réseau (Railway timeout, etc.) — reconnexion avec backoff
        const attempt = reconnectAttempts.get(sessionId) || 0
        const delay = Math.min(3000 * Math.pow(2, attempt), 60000) // max 60s
        reconnectAttempts.set(sessionId, attempt + 1)

        logger.info({ sessionId, attempt, delay }, '🔄 Reconnexion dans ' + (delay/1000) + 's...')
        io.to(sessionId).emit('reconnecting')

        setTimeout(async () => {
          try {
            const newSock = await createSocket(sessionId, cleanPhone)
            handleEvents(newSock, store, sessionId, cleanPhone, sessions.get(sessionId)?.ownerLid, sessions)
            if (sessions.has(sessionId)) sessions.get(sessionId).sock = newSock
            reconnectAttempts.delete(sessionId) // reset après succès
          } catch (err) {
            logger.error({ sessionId, err: err.message }, 'Erreur reconnexion')
          }
        }, delay)
      }
    }


  })

  sock.ev.on('creds.update', async () => {
    await saveCreds()
    await saveSession(sessionId, sessionPath, cleanPhone)
  })

  // ownerLid n'est défini qu'après connection.update — on le lit depuis la session dynamiquement
  handleEvents(sock, store, sessionId, cleanPhone, null, sessions)
  return sock
}

// ═══════════ ROUTES API ═══════════

app.post('/api/session/create', apiRateLimit, requireAuth, async (req, res) => {
  const { phone } = req.body
  if (!phone) return res.json({ success: false, error: 'Numéro requis' })

  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone || cleanPhone.length < 8) {
    return res.json({ success: false, error: 'Numéro invalide' })
  }

  // Pas de limite de sessions

  const sessionId = 'sess_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex')

  try {
    const sock = await createSocket(sessionId, cleanPhone)
    const store = new Map()
    sessions.set(sessionId, { sock, connected: false, phone: cleanPhone, store })
    logger.info({ sessionId }, '[API] Session créée')
    res.json({ success: true, sessionId })
  } catch (err) {
    logger.error({ err: err.message }, '[API] Erreur création')
    res.json({ success: false, error: err.message })
  }
})

app.get('/api/session/:sessionId', apiRateLimit, requireAuth, (req, res) => {
  const session = sessions.get(req.params.sessionId)
  if (!session) return res.json({ exists: false })
  res.json({ exists: true, connected: session.connected, phone: session.phone })
})

// ── Liste toutes les sessions (dashboard) ──
app.get('/api/sessions', apiRateLimit, (req, res) => {
  const list = []
  for (const [id, session] of sessions) {
    list.push({
      id,
      phone: session.phone || null,
      name: session.name || null,
      connected: session.connected || false,
      connecting: !session.connected && !!session.sock,
    })
  }
  res.json({ sessions: list, total: list.length })
})

app.delete('/api/session/:sessionId', apiRateLimit, requireAuth, async (req, res) => {
  const session = sessions.get(req.params.sessionId)
  if (!session) return res.json({ success: false })
  try { await session.sock.logout() } catch {}
  await deleteSession(req.params.sessionId)
  sessions.delete(req.params.sessionId)
  res.json({ success: true })
})

// ═══════════ RESTAURATION AU DÉMARRAGE ═══════════
async function restoreSessions() {
  try {
    const keys = await redis.keys('session:*')
    logger.info({ count: keys.length }, '[Redis] Sessions à restaurer')
    if (!keys.length) return

    // Récupérer toutes les données Redis en parallèle
    const entries = await Promise.all(keys.map(async key => {
      const data = await redis.get(key)
      return { key, data }
    }))

    // Lancer toutes les connexions WhatsApp en parallèle
    await Promise.allSettled(entries.map(async ({ key, data }) => {
      if (!data) return
      const sessionId = key.replace('session:', '')

      let phone = null
      try {
        const raw   = typeof data === 'string' ? data : JSON.stringify(data)
        const creds = JSON.parse(decryptSession(raw))
        phone = creds['__phone__'] || null
      } catch {
        try {
          const creds = typeof data === 'string' ? JSON.parse(data) : data
          phone = creds['__phone__'] || null
        } catch {}
      }

      if (!phone) return
      try {
        const sock = await createSocket(sessionId, phone)
        sessions.set(sessionId, { sock, connected: false, phone, store: new Map() })
        logger.info({ sessionId }, '[Redis] Session restaurée')
      } catch (err) {
        logger.error({ sessionId, err: err.message }, '[Redis] Erreur restauration')
      }
    }))

  } catch (err) {
    logger.error({ err: err.message }, '[Redis] Erreur restoreSessions')
  }
}

// ═══════════ SOCKET.IO ═══════════
io.on('connection', (socket) => {
  socket.on('join', (sessionId) => socket.join(sessionId))
  socket.on('joinRoom', (sessionId) => socket.join(sessionId))
})

// ═══════════ SPA FALLBACK ═══════════
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})


// ═══════════ SYSCAST POLLING ═══════════
// Vérifie toutes les 30s si un message système a été publié et le transmet à chaque owner
let lastSyscastDate = null

setInterval(async () => {
  try {
    const raw = await redis.get('syscast:latest')
    if (!raw) return
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data?.date || data.date === lastSyscastDate) return
    lastSyscastDate = data.date

    const icon = data.type === 'warning' ? '⚠️' : '📡'
    const text = `${icon} *Message du créateur du bot*\n\n${data.message}\n\n— *${config.botName}*`

    for (const [sessionId, session] of sessions) {
      if (!session.connected || !session.phone) continue
      try {
        await session.sock.sendMessage(session.phone + '@s.whatsapp.net', { text })
      } catch {}
    }
  } catch {}
}, 30 * 1000)

// ═══════════ START ═══════════
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, async () => {
  logger.info({ port: PORT }, '🌐 Serveur lancé')
  await loadCommands()
  await restoreSessions()
})