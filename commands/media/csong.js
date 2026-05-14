import { config } from '../../config.js'
import axios from 'axios'
import fs from 'fs'
import os from 'os'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import yts from 'yt-search'

// Set FFmpeg path
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

export default {
  name: 'csong',
  alias: ['csend'],
  desc: 'Download and send a song to a specific JID/Channel',
  category: 'owner',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const senderJid = msg.key.participant || msg.key.remoteJid

    // Reply helper function එක (පැරණි කේතයේ තිබුණු reply() එක වෙනුවට)
    const reply = async (text) => {
      return sock.sendMessage(jid, { text: text }, { quoted: msg })
    }

    try {
      // Owner check එක (ඔබගේ config.js එකේ owner අංකය තියෙන විදියට වෙනස් කරගන්න)
      const ownerNumber = config.ownerNumber || config.owner || '94700000000'; // මෙතනට ඔබේ අංකය දෙන්න හෝ config එකෙන් ගන්න
      const isOwner = senderJid.includes(ownerNumber)

      if (!isOwner) {
        return await reply("🚫 *Owner only command!*")
      }

      const targetJid = args[0]
      const query = args.slice(1).join(" ")

      if (!targetJid || !query) {
        return await reply("❌ *Format:* `.csong <jid> <song name>`\n\n*උදාහරණ:* `.csong 123456789012345@newsletter ගීතයේ නම`")
      }

      if (!targetJid.includes('@')) {
        return await reply("❌ *කරුණාකර නිවැරදි JID එකක් ලබා දෙන්න.*\n*(උදා: 123456...789@newsletter හෝ ...@g.us)*")
      }

      await reply("🔍 *ගීතය සොයමින් පවතී...*")

      const search = await yts(query)
      if (!search?.videos?.length) return await reply("❌ *ගීතය හමුනොවුණා!*")

      const data = search.videos[0]
      const ytUrl = data.url
      console.log("🎬 YouTube:", ytUrl)

      const api = `https://www.movanest.xyz/v2/ytmp3?url=${encodeURIComponent(ytUrl)}`
      const { data: apiRes } = await axios.get(api)

      if (!apiRes?.status || !apiRes?.result?.downloadUrl) {
        console.log("API Error Response:", apiRes)
        return await reply("❌ *ගීතය බාගත කළ නොහැක!*")
      }

      const result = apiRes.result
      const mp3Url = result.downloadUrl
      console.log("🎧 Download URL:", mp3Url)

      await reply("⏳ *ගීතය බාගත කරමින් පවතී...*")

      const tempMp3 = path.join(os.tmpdir(), `csong_temp_${Date.now()}.mp3`)
      const tempOpus = path.join(os.tmpdir(), `csong_temp_${Date.now()}.opus`)

      const mp3Res = await axios.get(mp3Url, { responseType: "arraybuffer" })
      fs.writeFileSync(tempMp3, Buffer.from(mp3Res.data))

      if (!fs.existsSync(tempMp3)) return await reply("❌ *MP3 ගොනුව සාදන ලදි නැහැ!*")

      let opusReady = false
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(tempMp3)
            .audioCodec("libopus")
            .format("opus")
            .on("end", () => {
              if (fs.existsSync(tempOpus)) {
                opusReady = true
                resolve()
              } else reject(new Error("No opus file created"))
            })
            .on("error", (err) => {
              console.error("❌ FFmpeg Error:", err.message)
              reject(err)
            })
            .save(tempOpus)
        })
      } catch (err) {
        console.warn("⚠️ Opus conversion failed. Fallback to MP3.")
      }

      let channelname = targetJid
      try {
        const metadata = await sock.newsletterMetadata("jid", targetJid)
        if (metadata?.name) {
          channelname = metadata.name
        }
      } catch (err) {
        // console.error("Newsletter metadata error:", err)
      }

      const caption = `☘️ *Title: ${result.title}*
        
❒ *🎭 Vɪᴇᴡꜱ :* ${data.views}
❒ *⏱️ Dᴜʀᴀᴛɪᴏɴ :* ${data.timestamp}
❒ *📅 Rᴇʟᴇᴀꜱᴇ Dᴀᴛᴇ :* ${data.ago}
          
*00:00 ───●────────── ${data.timestamp}*
* *ලස්සන රියැක්ට් ඕනී ...💗😽🍃*
> *${channelname}*`

      try {
        console.log(`📤 Sending image & caption to: ${targetJid}`)
        await sock.sendMessage(targetJid, {
          image: { url: data.thumbnail },
          caption: caption,
        })
      } catch (err) {
        console.error("❌ Thumbnail Send Error:", err)
        await reply(`*Image යැවීමේදී දෝෂයක්!* \n\n\`\`\`${err.message || err}\`\`\``)
      }

      try {
        console.log(`📤 Sending Audio to: ${targetJid}`)
        if (opusReady && fs.existsSync(tempOpus)) {
          const opusBuffer = fs.readFileSync(tempOpus)
          await sock.sendMessage(targetJid, {
            audio: opusBuffer,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true, 
          })
        } else {
          await sock.sendMessage(targetJid, {
            audio: fs.readFileSync(tempMp3),
            mimetype: "audio/mpeg",
            ptt: false,
          })
        }
        await reply(`✅ *${result.title}* successfully sent to *${channelname}* 😎🎶`)
      } catch (err) {
        console.error("❌ Audio Send Error:", err)
        await reply(`*Audio යැවීමේදී දෝෂයක්!* \n\n\`\`\`${err.message || err}\`\`\``)
      }

      // Temp files delete කිරීම
      if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3)
      if (fs.existsSync(tempOpus)) fs.unlinkSync(tempOpus)

    } catch (e) {
      console.error("CSong Fatal Error:", e)
      await reply(`*ඇතැම් දෝෂයකි! පසුව නැවත උත්සහ කරන්න.*\n\n\`\`\`${e.message}\`\`\``)
    }
  }
}

