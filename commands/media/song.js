import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// Map pour stocker les sessions .song en attente de choix
export const songSessions = new Map()

async function smartSearch(query) {
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apis.mistral}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: `Transforme cette demande en une recherche YouTube optimale pour trouver la chanson. Réponds UNIQUEMENT avec le texte de recherche, rien d'autre. Demande: "${query}"`
        }]
      })
    })
    const data = await res.json()
    // FIX : supprime tous les guillemets de la réponse Mistral
    return data.choices[0].message.content.trim().replace(/['"`]/g, '')
  } catch {
    return query.replace(/['"`]/g, '') // fallback aussi nettoyé
  }
}

async function getVideoInfo(searchQuery) {
  // FIX : utiliser des guillemets simples pour éviter les conflits
  const safeQuery = searchQuery.replace(/"/g, '').replace(/'/g, '')
  const { stdout } = await execAsync(
    `yt-dlp --no-playlist --print "%(title)s|%(duration_string)s|%(uploader)s" --no-warnings "ytsearch1:${safeQuery}"`,
    { timeout: 30000 }
  )
  const line = stdout.trim().split('\n')[0] // prend seulement la première ligne
  const parts = line.split('|')
  return {
    title: parts[0] || 'Inconnu',
    duration: parts[1] || '??:??',
    uploader: parts[2] || 'Inconnu'
  }
}

async function downloadSong(searchQuery, format) {
  const safeQuery = searchQuery.replace(/"/g, '').replace(/'/g, '')
  const outputPath = `./temp/song_${Date.now()}`

  if (!fs.existsSync('./temp')) fs.mkdirSync('./temp')

  await execAsync(
    `yt-dlp --no-playlist --extract-audio --audio-format mp3 --audio-quality 2 --no-warnings --quiet -o "${outputPath}.%(ext)s" "ytsearch1:${safeQuery}"`,
    { timeout: 120000 }
  )
  return `${outputPath}.mp3`
}

export default {
  name: 'song',
  alias: ['play', 'music', 'yta'],
  desc: 'Télécharger une chanson',
  category: 'media',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const senderJid = msg.key.participant || msg.key.remoteJid

    // Si c'est une réponse à un menu .song
    const session = songSessions.get(jid)
    if (session && msg.message?.extendedTextMessage?.contextInfo?.stanzaId === session.menuId) {
      const choice = (args[0] || '').trim()
      if (choice === '1' || choice === '2') {
        songSessions.delete(jid)
        const format = choice === '1' ? 'audio' : 'document'

        await sock.sendMessage(jid, { text: '⏳ Téléchargement en cours...' })
        await sock.sendPresenceUpdate('recording', jid)

        try {
          const filePath = await downloadSong(session.searchQuery, format)
          if (!fs.existsSync(filePath)) throw new Error('Fichier introuvable')
          const buffer = fs.readFileSync(filePath)

          if (format === 'audio') {
            await sock.sendMessage(jid, {
              audio: buffer,
              mimetype: 'audio/mpeg',
              ptt: false,
              fileName: `${session.title}.mp3`
            })
          } else {
            await sock.sendMessage(jid, {
              document: buffer,
              mimetype: 'audio/mpeg',
              fileName: `${session.title}.mp3`
            })
          }

          await sock.sendMessage(jid, {
            text: `${personality.format('success')}${personality.maybeFlexCreator()}`
          })

          fs.unlinkSync(filePath)
        } catch (err) {
          console.error('[SONG ERROR]', err)
          await sock.sendMessage(jid, { text: personality.format('error_technical') })
        } finally {
          await sock.sendPresenceUpdate('available', jid)
        }
        return
      }
    }

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .song <nom de la chanson>'
      })
    }

    const query = args.join(' ')
    await sock.sendMessage(jid, { text: '🔍 Recherche en cours...' })

    try {
      const searchQuery = await smartSearch(query)
      const info = await getVideoInfo(searchQuery)

      const menuText = `╭━━━━━━━━━━━━━━━━━━╮
⚡ *ZΞRO — MUSIC*
╰━━━━━━━━━━━━━━━━━━╯

🎵 *${info.title}*
👤 ${info.uploader}
⏱️ ${info.duration}

━━━━━━━━━━━━━━━━━━
📥 *Choisir le format :*

1️⃣ 🎧 Audio (lecture directe)
2️⃣ 📄 Document (téléchargement)
━━━━━━━━━━━━━━━━━━
_Reply à ce message avec 1 ou 2_`

      const sent = await sock.sendMessage(jid, { text: menuText })

      // Sauvegarder la session
      songSessions.set(jid, {
        menuId: sent.key.id,
        searchQuery,
        title: info.title,
        senderJid
      })

      // Auto-expire après 2 minutes
      setTimeout(() => {
        if (songSessions.has(jid) && songSessions.get(jid).menuId === sent.key.id) {
          songSessions.delete(jid)
        }
      }, 120000)

    } catch (err) {
      console.error('[SONG ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}