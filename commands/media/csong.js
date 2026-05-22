import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

async function getVideoInfo(query) {
  const safeQuery = query.replace(/"/g, '').replace(/'/g, '')
  const { stdout } = await execAsync(
    `yt-dlp --no-playlist --print "%(title)s|%(duration_string)s|%(uploader)s|%(thumbnail)s|%(view_count)s|%(upload_date)s" --no-warnings "ytsearch1:${safeQuery}"`,
    { timeout: 30000 }
  )
  const line = stdout.trim().split('\n')[0]
  const parts = line.split('|')
  return {
    title: parts[0] || 'Inconnu',
    duration: parts[1] || '??:??',
    uploader: parts[2] || 'Inconnu',
    thumbnail: parts[3] || null,
    views: parts[4] || '0',
    date: parts[5] || ''
  }
}

async function downloadSong(query) {
  const safeQuery = query.replace(/"/g, '').replace(/'/g, '')
  const outputPath = `./temp/csong_${Date.now()}`
  if (!fs.existsSync('./temp')) fs.mkdirSync('./temp')

  await execAsync(
    `yt-dlp --no-playlist --extract-audio --audio-format mp3 --audio-quality 2 --no-warnings --quiet -o "${outputPath}.%(ext)s" "ytsearch1:${safeQuery}"`,
    { timeout: 120000 }
  )
  return `${outputPath}.mp3`
}

export default {
  name: 'csong',
  alias: ['csend'],
  desc: 'Télécharger et envoyer une chanson vers un JID/Channel',
  category: 'media',
  ownerOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg })

    // ─── Validation args ───────────────────────────────────────────
    const targetJid = args[0]
    const query = args.slice(1).join(' ')

    if (!targetJid || !query) {
      return reply(
        personality.format('error_usage') +
        `\n\n*Format :* \`${config.prefix}csong <jid> <nom chanson>\`` +
        `\n*Exemple :* \`${config.prefix}csong 123456789@newsletter Shape of You\``
      )
    }

    if (!targetJid.includes('@')) {
      return reply('❌ JID invalide.\n*(ex: 123456789@newsletter ou ...@g.us)*')
    }

    try {
      // ─── Recherche infos ───────────────────────────────────────────
      await reply('🔍 Recherche en cours...')

      const info = await getVideoInfo(query)

      // ─── Téléchargement ────────────────────────────────────────────
      await sock.sendMessage(jid, { text: '⏳ Téléchargement...' }, { quoted: msg })
      await sock.sendPresenceUpdate('recording', jid)

      const filePath = await downloadSong(query)

      if (!fs.existsSync(filePath)) {
        return reply(personality.format('error_technical'))
      }

      const audioBuffer = fs.readFileSync(filePath)

      // ─── Nom du canal/groupe ───────────────────────────────────────
      let channelName = targetJid
      try {
        const metadata = await sock.newsletterMetadata('jid', targetJid)
        if (metadata?.name) channelName = metadata.name
      } catch {
        try {
          const meta = await sock.groupMetadata(targetJid)
          if (meta?.subject) channelName = meta.subject
        } catch {}
      }

      // ─── Caption ───────────────────────────────────────────────────
      const caption =
`☘️ *${info.title}*

❒ *👤 Artiste :* ${info.uploader}
❒ *⏱️ Durée :* ${info.duration}
❒ *🎭 Vues :* ${Number(info.views).toLocaleString()}

*00:00 ───●────────── ${info.duration}*

> *${channelName}*`

      // ─── Envoi thumbnail ───────────────────────────────────────────
      if (info.thumbnail) {
        try {
          await sock.sendMessage(targetJid, {
            image: { url: info.thumbnail },
            caption
          })
        } catch {
          await sock.sendMessage(targetJid, { text: caption })
        }
      } else {
        await sock.sendMessage(targetJid, { text: caption })
      }

      // ─── Envoi audio ───────────────────────────────────────────────
      await sock.sendMessage(targetJid, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${info.title}.mp3`
      })

      await reply(
        `✅ *${info.title}* envoyé vers *${channelName}* 🎶\n\n— ${personality.format('success')}${personality.maybeFlexCreator()}`
      )

      // ─── Nettoyage ─────────────────────────────────────────────────
      fs.unlinkSync(filePath)

    } catch (err) {
      console.error('[CSONG ERROR]', err)
      await reply(personality.format('error_technical'))
    } finally {
      await sock.sendPresenceUpdate('available', jid)
    }
  }
}