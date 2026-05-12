import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

async function smartSearch(query) {
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
  return data.choices[0].message.content.trim()
}

export default {
  name: 'song',
  alias: ['play', 'music', 'yta'],
  desc: 'Télécharger une chanson',
  category: 'media',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .song <nom de la chanson>'
      })
    }

    const query = args.join(' ')

    await sock.sendMessage(jid, { text: personality.format('loading') })
    await sock.sendPresenceUpdate('recording', jid)

    try {
      const searchQuery = await smartSearch(query)
      const outputPath = `./temp/song_${Date.now()}`

      await execAsync(
        `yt-dlp --no-playlist --extract-audio --audio-format mp3 --audio-quality 2 --downloader aria2c --downloader-args "aria2c:-x 16 -s 16 -k 1M" --no-warnings --quiet -o "${outputPath}.%(ext)s" "ytsearch1:${searchQuery}"`,
        { timeout: 60000 }
      )

      const filePath = `${outputPath}.mp3`

      if (!fs.existsSync(filePath)) throw new Error('Fichier introuvable')

      const audioBuffer = fs.readFileSync(filePath)

      await sock.sendMessage(jid, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false
      })

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
  }
}