import { handleMessage } from './messageHandler.js'
import { config } from '../config.js'

export const groupSettings = new Map()

// FIX MESSAGES DOUBLES : on garde une référence des sockets déjà écoutés
const registeredSockets = new WeakSet()

export function handleEvents(sock, store) {

  // FIX : si ce socket est déjà enregistré, on skip pour éviter les doublons
  if (registeredSockets.has(sock)) {
    console.log('[EventHandler] Socket déjà enregistré, skip.')
    return
  }
  registeredSockets.add(sock)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(`✅ ${config.botName} est connecté`)
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      console.log(`❌ Déconnecté — code: ${code}`)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (!msg.message) continue
      if (msg.key.remoteJid === 'status@broadcast') continue
      await handleMessage(sock, msg)
    }
  })

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    const settings = groupSettings.get(id) || { welcome: false, goodbye: false }

    if (action === 'add' && settings.welcome) {
      for (const participant of participants) {
        try {
          // FIX : participant peut être string ou objet
          const participantJid = typeof participant === 'string'
            ? participant
            : participant.id || participant.jid || String(participant)

          const participantNum = participantJid.split('@')[0]

          await sock.sendMessage(id, {
            text: `👋 Bienvenue @${participantNum} !\nTape ${config.prefix}menu si t'es perdu.`,
            mentions: [participantJid]
          })
        } catch (err) {
          console.error('[WELCOME ERROR]', err.message)
        }
      }
    }

    if (action === 'remove' && settings.goodbye) {
      for (const participant of participants) {
        try {
          // FIX : même correction pour goodbye
          const participantJid = typeof participant === 'string'
            ? participant
            : participant.id || participant.jid || String(participant)

          const participantNum = participantJid.split('@')[0]

          await sock.sendMessage(id, {
            text: `👋 @${participantNum} a quitté le groupe.`,
            mentions: [participantJid]
          })
        } catch (err) {
          console.error('[GOODBYE ERROR]', err.message)
        }
      }
    }
  })
}