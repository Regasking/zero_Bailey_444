import { handleMessage } from './messageHandler.js'
import { config } from '../config.js'

// Paramètres welcome/goodbye par groupe
export const groupSettings = new Map()

export function handleEvents(sock, store) {

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
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
          const participantNum = typeof participant === 'string'
            ? participant.split('@')[0]
            : participant.id?.split('@')[0] || 'nouveau membre'

          await sock.sendMessage(id, {
            text: `👋 Bienvenue @${participantNum} !\nTape ${config.prefix}menu si t'es perdu.`,
            mentions: [participant]
          })
        } catch (err) {
          console.error('[WELCOME ERROR]', err.message)
        }
      }
    }

    if (action === 'remove' && settings.goodbye) {
      for (const participant of participants) {
        try {
          await sock.sendMessage(id, {
            text: `👋 @${participant.split('@')[0]} a quitté le groupe.`,
            mentions: [participant]
          })
        } catch (err) {
          console.error('[GOODBYE ERROR]', err.message)
        }
      }
    }
  })
}