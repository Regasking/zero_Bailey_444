import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import readline from 'readline'
import { loadCommands, setStore } from './handlers/messageHandler.js'
import { handleEvents } from './handlers/eventHandler.js'
import { config } from './config.js'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise(resolve => rl.question(text, resolve))

// Store maison pour cacher les messages
const store = new Map()

let phoneNumber = null

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
    browser: ["Ubuntu", "Chrome", "122.0.6261.112"],
    syncFullHistory: true,
  })

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key?.id) store.set(msg.key.id, msg)
    }
  })

  let pairingRequested = false

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

    // 🔥 Le fix — demander le code quand connection === 'connecting'
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
      }, 5000) // attendre 5 secondes que la connexion soit établie
    }

    if (connection === 'open') {
      const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
      const botLid = sock.user?.lid || null
      console.log(`✅ ${config.botName} connecté — Owner dynamique : ${botNumber}`)
      console.log('BOT LID:', sock.user)
      config.dynamicOwner = botNumber
      config.connectedLid = sock.user?.lid?.split(':')[0] + '@lid'
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnexion...')
        startBot()
      } else {
        console.log('🚪 Déconnecté. Supprime sessions et relance.')
        process.exit(0)
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)
  await loadCommands()
  setStore(store)
  handleEvents(sock, store)
}

startBot()