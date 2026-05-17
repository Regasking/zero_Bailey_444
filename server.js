import { personality } from './utils/personality.js'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// ═══════════ REDIS CLIENT ═══════════
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

// ═══════════ PERSISTANCE SESSION ═══════════

async function saveSession(sessionId, sessionPath, phone) {
  try {
    if (!fs.existsSync(sessionPath)) return
    const files = fs.readdirSync(sessionPath)
    const creds = {}
    for (const file of files) {
      const filePath = path.join(sessionPath, file)
      creds[file] = fs.readFileSync(filePath, 'utf8')
    }
    creds['__phone__'] = phone
    await redis.set(`session:${sessionId}`, JSON.stringify(creds))
    console.log(`[Redis] Session ${sessionId} sauvegardée`)
  } catch (err) {
    console.error('[Redis] Erreur save session:', err.message)
  }
}

async function loadSession(sessionId, sessionPath) {
  try {
    const data = await redis.get(`session:${sessionId}`)
    if (!data) return false
    const creds = typeof data === 'string' ? JSON.parse(data) : data
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })
    for (const [file, content] of Object.entries(creds)) {
      fs.writeFileSync(path.join(sessionPath, file), content)
    }
    console.log(`[Redis] Session ${sessionId} rechargée`)
    return true
  } catch (err) {
    console.error('[Redis] Erreur load session:', err.message)
    return false
  }
}

async function deleteSession(sessionId) {
  try {
    await redis.del(`session:${sessionId}`)
    console.log(`[Redis] Session ${sessionId} supprimée`)
  } catch (err) {
    console.error('[Redis] Erreur delete session:', err.message)
  }
}

const sessions = new Map()

// ═══════════ FONCTION CRÉATION SOCKET ═══════════

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
          console.log(`[${sessionId}] Code: ${code}`)
        } catch (err) {
          io.to(sessionId).emit('error', { message: 'Erreur pairing code: ' + err.message })
        }
      }, 5000)
    }

    if (connection === 'open') {
      const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
      const connectedLid = sock.user?.lid?.split(':')[0] + '@lid'

      if (sessions.has(sessionId)) {
        const session = sessions.get(sessionId)
        session.connected = true
        session.sock = sock
        session.dynamicOwner = botNumber
        session.connectedLid = connectedLid
        session.store = store
        setStore(store)
      }

      // FIX 1 — Toujours mettre à jour config peu importe le nombre de sessions
      // (sans ça, isOwner() retourne false si plus d'une session connectée)
      config.dynamicOwner = botNumber
      config.connectedLid = connectedLid

      console.log(`✅ [${sessionId}] Connecté: ${botNumber} | LID: ${connectedLid}`)

      io.to(sessionId).emit('connected', {
        number: botNumber,
        name: sock.user?.name
      })

      // FIX 2 — Message de bienvenue envoyé au numéro connecté 5s après connexion
      setTimeout(async () => {
        try {
          const ownerJid = cleanPhone + '@s.whatsapp.net'
          await sock.sendMessage(ownerJid, {
            text: personality.getWelcomeMessage(config.botName)
          })
        } catch (err) {
          console.error(`[${sessionId}] Erreur message bienvenue:`, err.message)
        }
      }, 5000)
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(`❌ [${sessionId}] Déconnecté — code: ${code}`)

      if (sessions.get(sessionId)?.connected) return

      if (code === DisconnectReason.loggedOut) {
        await deleteSession(sessionId)
        sessions.delete(sessionId)
        io.to(sessionId).emit('disconnected')
      } else {
        io.to(sessionId).emit('reconnecting')
        setTimeout(async () => {
          console.log(`[${sessionId}] Reconnexion en cours...`)
          try {
            const newSock = await createSocket(sessionId, cleanPhone)
            handleEvents(newSock, store)
            if (sessions.has(sessionId)) sessions.get(sessionId).sock = newSock
          } catch (err) {
            console.error(`[${sessionId}] Erreur reconnexion:`, err.message)
          }
        }, 3000)
      }
    }
  })

  sock.ev.on('creds.update', async () => {
    await saveCreds()
    await saveSession(sessionId, sessionPath, cleanPhone)
  })

  handleEvents(sock, store)
  return sock
}

// ═══════════ API ═══════════

app.post('/api/session/create', async (req, res) => {
  const { phone } = req.body
  if (!phone) return res.json({ success: false, error: 'Numéro requis' })

  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone || cleanPhone.length < 8) {
    return res.json({ success: false, error: 'Numéro invalide' })
  }

  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)

  try {
    const sock = await createSocket(sessionId, cleanPhone)
    const store = new Map()
    sessions.set(sessionId, { sock, connected: false, phone: cleanPhone, store })
    res.json({ success: true, sessionId })
  } catch (err) {
    console.error(err)
    res.json({ success: false, error: err.message })
  }
})

app.get('/api/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId)
  if (!session) return res.json({ exists: false })
  res.json({ exists: true, connected: session.connected, phone: session.phone })
})

app.delete('/api/session/:sessionId', async (req, res) => {
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
    console.log(`[Redis] ${keys.length} session(s) à restaurer`)
    for (const key of keys) {
      const sessionId = key.replace('session:', '')
      const data = await redis.get(key)
      if (!data) continue
      const creds = typeof data === 'string' ? JSON.parse(data) : data
      const phone = creds['__phone__'] || null
      if (!phone) continue
      try {
        const sock = await createSocket(sessionId, phone)
        const store = new Map()
        sessions.set(sessionId, { sock, connected: false, phone, store })
        console.log(`[Redis] Session ${sessionId} restaurée`)
      } catch (err) {
        console.error(`[Redis] Erreur restauration ${sessionId}:`, err.message)
      }
    }
  } catch (err) {
    console.error('[Redis] Erreur restoreSessions:', err.message)
  }
}

// ═══════════ SOCKET.IO ═══════════
io.on('connection', (socket) => {
  socket.on('join', (sessionId) => {
    socket.join(sessionId)
    console.log(`[Socket] Rejoint room: ${sessionId}`)
  })
  socket.on('joinRoom', (sessionId) => {
    socket.join(sessionId)
  })
})

// ═══════════ ROUTES ═══════════
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ═══════════ START ═══════════
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, async () => {
  console.log(`🌐 Serveur lancé sur http://localhost:${PORT}`)
  await loadCommands()
  await restoreSessions()
})