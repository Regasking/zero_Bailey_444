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
import { Boom } from '@hapi/boom'  // FIX #1: Boom manquait dans server.js
import pino from 'pino'
import fs from 'fs'
import { loadCommands } from './handlers/messageHandler.js'
import { handleEvents } from './handlers/eventHandler.js'
import { config } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// Sessions actives
const sessions = new Map()

// ═══════════ API ═══════════

// Créer une nouvelle session
app.post('/api/session/create', async (req, res) => {
  const { phone } = req.body

  // FIX #2: Le sessionId est généré côté serveur (le front n'en envoyait pas)
  if (!phone) {
    return res.json({ success: false, error: 'Numéro requis' })
  }

  // Nettoyage serveur : chiffres uniquement
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone || cleanPhone.length < 8) {
    return res.json({ success: false, error: 'Numéro invalide' })
  }

  // Générer un sessionId unique côté serveur
  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)

  if (sessions.has(sessionId)) {
    return res.json({ success: false, error: 'Session déjà active' })
  }

  try {
    const sessionPath = `./sessions/${sessionId}`
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Chrome'),
      syncFullHistory: false,
    })

    const store = new Map()
    sock.ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (msg.key?.id) store.set(msg.key.id, msg)
      }
    })

    let pairingRequested = false

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if ((connection === 'connecting' || qr) && !sock.authState.creds.registered && !pairingRequested) {
        pairingRequested = true
        setTimeout(async () => {
          try {
            const code = await sock.requestPairingCode(cleanPhone.trim())
            io.to(sessionId).emit('pairingCode', { code })
            console.log(`[${sessionId}] Code: ${code}`)
          } catch (err) {
            io.to(sessionId).emit('error', { message: 'Erreur pairing code: ' + err.message })
          }
        }, 8000)
      }

      if (connection === 'open') {
        pairingRequested = true // réutilise le flag pour bloquer les reco inutiles
        const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
        config.dynamicOwner = botNumber
        config.connectedLid = sock.user?.lid?.split(':')[0] + '@lid'
        sessions.get(sessionId).connected = true
        io.to(sessionId).emit('connected', {
          number: botNumber,
          name: sock.user?.name
        })
        console.log(`✅ [${sessionId}] Connecté: ${botNumber}`)
      }

      if (connection === 'close') {
        if (sessions.get(sessionId)?.connected) return // déjà connecté, ignore
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode
        console.log(`❌ Déconnecté — code: ${code}`)

        if (code === DisconnectReason.loggedOut) {
          sessions.delete(sessionId)
          io.to(sessionId).emit('disconnected')
        } else {
          io.to(sessionId).emit('reconnecting')
          setTimeout(async () => {
            console.log(`[${sessionId}] Reconnexion en cours...`)
            try {
              const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`)
              const { version } = await fetchLatestBaileysVersion()
              const newSock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                browser: Browsers.macOS('Chrome'),
                syncFullHistory: false,
              })
              newSock.ev.on('creds.update', saveCreds)
              // MANQUAIT : attacher les listeners de messages
              handleEvents(newSock, store)
              sessions.get(sessionId).sock = newSock
              sessions.get(sessionId).connected = true
            } catch (err) {
              console.error(`[${sessionId}] Erreur reconnexion:`, err.message)
            }
          }, 3000)
        }
      }
    })

    sock.ev.on('creds.update', saveCreds)
    // FIX #4: store passé à handleEvents (manquait avant)
    handleEvents(sock, store)

    sessions.set(sessionId, { sock, connected: false, phone: cleanPhone, store })
    // FIX #5: Renvoie le sessionId généré au front
    res.json({ success: true, sessionId })

  } catch (err) {
    console.error(err)
    res.json({ success: false, error: err.message })
  }
})

// Status d'une session
app.get('/api/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId)
  if (!session) return res.json({ exists: false })
  res.json({ exists: true, connected: session.connected, phone: session.phone })
})

// Déconnecter une session
app.delete('/api/session/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId)
  if (!session) return res.json({ success: false })
  try {
    await session.sock.logout()
  } catch {}
  sessions.delete(req.params.sessionId)
  res.json({ success: true })
})

// ═══════════ SOCKET.IO ═══════════
io.on('connection', (socket) => {
  // FIX #6: Écoute "join" ET "joinRoom" pour compatibilité totale
  socket.on('join', (sessionId) => {
    socket.join(sessionId)
    console.log(`[Socket] Rejoint room: ${sessionId}`)
  })
  socket.on('joinRoom', (sessionId) => {
    socket.join(sessionId)
    console.log(`[Socket] Rejoint room (joinRoom): ${sessionId}`)
  })
})

// ═══════════ ROUTES ═══════════
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ═══════════ START ═══════════
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`🌐 Serveur lancé sur http://localhost:${PORT}`)
})