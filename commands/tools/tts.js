import { personality } from '../../utils/personality.js'
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Détecte la langue dominante du texte (fr par défaut)
function detectLang(text) {
  const arabicRe = /[\u0600-\u06FF]/
  const englishRe = /^[a-zA-Z0-9\s.,!?'"-]+$/
  if (arabicRe.test(text)) return 'ar'
  if (englishRe.test(text)) return 'en'
  return 'fr'
}

// Télécharge une URL et retourne un Buffer
function download(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    proto.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

export default {
  name: 'tts',
  alias: ['voice', 'vocal'],
  desc: 'Texte en vocal',
  category: 'tools',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: `${personality.format('error_usage')}\n\nUtilisation : .tts <texte>\nEx : .tts Bonjour tout le monde`
      }, { quoted: msg })
    }

    const text = args.join(' ').trim()
    if (text.length > 200) {
      return sock.sendMessage(jid, {
        text: `⚠️ Texte trop long (max 200 caractères).\n\n— *${(await import('../../config.js')).config.botName}*`
      }, { quoted: msg })
    }

    const lang = detectLang(text)

    // On essaie 2 services TTS gratuits dans l'ordre
    const sources = [
      // 1. VoiceRSS (gratuit, fiable, retourne MP3 direct)
      `https://api.voicerss.org/?key=voicerss_demo&hl=${lang === 'ar' ? 'ar-eg' : lang === 'en' ? 'en-us' : 'fr-fr'}&src=${encodeURIComponent(text)}&f=16khz_16bit_mono&c=mp3`,
      // 2. Google Translate TTS (parfois bloqué selon IP)
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=gtx&ttsspeed=1`,
    ]

    try {
      await sock.sendMessage(jid, { text: personality.format('loading') }, { quoted: msg })

      let audioBuffer = null
      let lastErr = null

      for (const url of sources) {
        try {
          const buf = await download(url)
          // VoiceRSS retourne une erreur en texte si la clé est invalide
          if (buf.toString('utf8', 0, 5).startsWith('ERROR')) continue
          if (buf.length < 1000) continue // trop petit = erreur silencieuse
          audioBuffer = buf
          break
        } catch (e) {
          lastErr = e
        }
      }

      if (!audioBuffer) throw lastErr || new Error('Tous les services TTS ont échoué')

      // Sauvegarde tmp
      const tmpDir = path.join(__dirname, '../../temp')
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
      const tmpPath = path.join(tmpDir, `tts_${Date.now()}.mp3`)
      fs.writeFileSync(tmpPath, audioBuffer)

      await sock.sendMessage(jid, {
        audio: fs.readFileSync(tmpPath),
        mimetype: 'audio/mpeg',
        ptt: true  // ← message vocal (bulle ronde)
      }, { quoted: msg })

      fs.unlinkSync(tmpPath)

    } catch (err) {
      console.error('[TTS ERROR]', err)
      await sock.sendMessage(jid, {
        text: `❌ TTS indisponible pour le moment.\n\n— *${(await import('../../config.js')).config.botName}*`
      }, { quoted: msg })
    }
  }
}