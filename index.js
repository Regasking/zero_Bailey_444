import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import readline from 'readline'
import { loadCommands, setStore, addToStore } from './handlers/messageHandler.js'
import { handleEvents } from './handlers/eventHandler.js'
import { config } from './config.js'
import { Redis } from '@upstash/redis'
import os from 'os'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise(resolve => rl.question(text, resolve))

// ═══════════════════════════════════════════════
// STATS GLOBALES — accessibles depuis botinfo.js
// ═══════════════════════════════════════════════
export const botStats = {
  startTime: Date.now(),
  messagesHandled: 0,
  commandsUsed: 0,
  groupCount: 0,
  userCount: 0,
  version: '2.0.0',
}

// Store maison pour cacher les messages
const store = new Map()

let phoneNumber = null
let reconnectAttempts = 0
const MAX_RECONNECT = 10

// ─── Uptime formaté ────────────────────────────
export function getUptime() {
  const ms = Date.now() - botStats.startTime
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}j ${h % 24}h ${m % 60}m`
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

// ─── RAM utilisée ───────────────────────────────
export function getRAMUsage() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024
  return `${used.toFixed(1)} MB`
}

// ─── Comptage réel des utilisateurs uniques ────
export async function countRealUsers() {
  try {
    const keys = await redis.keys('seen:*')
    return keys.length
  } catch {
    return 0
  }
}

// ─── Mise à jour des stats groupes/users ───────
async function updateGroupStats(sock) {
  try {
    const groups = await sock.groupFetchAllParticipating()
    const groupList = Object.values(groups)
    botStats.groupCount = groupList.length

    const uniqueUsers = new Set()
    for (const g of groupList) {
      for (const p of g.participants) {
        uniqueUsers.add(p.id || p.jid)
      }
    }
    botStats.userCount = uniqueUsers.size
  } catch {}
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions')
  const { version } = await fetchLatestBaileysVersion()

  if (!phoneNumber && !state.creds.registered) {
    phoneNumber = await question('📱 Entre ton numéro (ex: 50955442656) : ')
  }

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '122.0.6261.112'],
    syncFullHistory: true,
    getMessage: async (key) => {
      return store.get(key.id) || { conversation: '' }
    }
  })

  // ─── Store messages ─────────────────────────
  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key?.id) {
        // FIX 3 — Store borné via addToStore
        addToStore(store, msg.key.id, msg)
        botStats.messagesHandled++
      }
    }
  })

  let pairingRequested = false

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

    if (connection === 'connecting' && !sock.authState.creds.registered && !pairingRequested && phoneNumber) {
      pairingRequested = true
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber.trim())
          console.log(`\n🔑 Code de jumelage : ${code}`)
          console.log('👉 WhatsApp → Appareils connectés → Associer un appareil → Entre le code\n')
        } catch (err) {
          console.error('Erreur pairing code:', err.message)
        }
      }, 5000)
    }

    if (connection === 'open') {
      reconnectAttempts = 0
      botStats.startTime = Date.now()

      const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
      config.dynamicOwner = botNumber
      config.connectedLid = sock.user?.lid?.split(':')[0] + '@lid'

      console.log(`\n╔══════════════════════════╗`)
      console.log(`  ⚡  ${config.botName}`)
      console.log(`╚══════════════════════════╝`)
      console.log(`✅ Connecté    : ${botNumber}`)
      console.log(`🔑 LID         : ${config.connectedLid}`)
      console.log(`📦 Version     : ${botStats.version}`)
      console.log(`🖥️  OS          : ${os.platform()} ${os.release()}`)
      console.log(`💾 RAM totale  : ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`)
      console.log(`⏱️  Démarré à  : ${new Date().toLocaleTimeString('fr-FR')}\n`)

      // Stats groupes/users après 5s (laisser le temps à Baileys)
      setTimeout(() => updateGroupStats(sock), 5000)

      // Refresh stats toutes les 10 minutes
      setInterval(() => updateGroupStats(sock), 10 * 60 * 1000)
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut

      if (isLoggedOut) {
        console.log('🚪 Déconnecté définitivement. Supprime sessions et relance.')
        process.exit(0)
      }

      reconnectAttempts++
      if (reconnectAttempts > MAX_RECONNECT) {
        console.error(`❌ ${MAX_RECONNECT} tentatives échouées. Arrêt.`)
        process.exit(1)
      }

      const delay = Math.min(1000 * 2 ** reconnectAttempts, 60000) // backoff exponentiel, max 60s
      console.log(`🔄 Reconnexion dans ${delay / 1000}s... (tentative ${reconnectAttempts}/${MAX_RECONNECT})`)
      setTimeout(() => startBot(), delay)
    }
  })

  sock.ev.on('creds.update', saveCreds)
  await loadCommands()
  setStore(store)
  handleEvents(sock, store)
}

startBot()