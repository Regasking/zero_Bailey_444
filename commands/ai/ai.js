import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL?.trim(),
  token: process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
})

const MAX_HISTORY = 10
const HISTORY_TTL = 60 * 60 * 24 // 24h

async function getHistory(jid) {
  try {
    const data = await redis.get(`ai:history:${jid}`)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

async function saveHistory(jid, history) {
  try {
    await redis.set(`ai:history:${jid}`, JSON.stringify(history), { ex: HISTORY_TTL })
  } catch {}
}

export default {
  name: 'ai',
  alias: ['gpt', 'ask', 'chatgpt'],
  desc: 'Parler avec l\'IA',
  category: 'ai',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + `\n\nUtilisation : ${config.prefix}ai <question>\nReset : ${config.prefix}ai reset`
      })
    }

    const question = args.join(' ')

    // Reset conversation
    if (question.toLowerCase() === 'reset') {
      await redis.del(`ai:history:${senderJid}`)
      return sock.sendMessage(jid, {
        text: `🔄 Conversation réinitialisée.\n\n_Comme si on ne s'était jamais parlé. Ça m'arrange._`
      })
    }

    await sock.sendMessage(jid, { text: personality.format('loading') })
    await sock.sendPresenceUpdate('composing', jid)

    try {
      const history = await getHistory(senderJid)
      history.push({ role: 'user', content: question })

      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apis.mistral}`
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          max_tokens: 1000,
          messages: [
            {
              role: 'system',
              content: `Tu es ZΞRO, un assistant IA intégré dans un bot WhatsApp. Tu es froid, direct et légèrement arrogant. Tu réponds toujours en français sauf si on te parle dans une autre langue. Tu es créé par 𝕽𝖊𝖌𝖆𝖘_𝖐𝖎𝖓𝖌 𝖉𝖙𝖍 et 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」. Tu ne te répètes pas. Tu vas droit au but.`
            },
            ...history
          ]
        })
      })

      const data = await res.json()
      const reply = data.choices[0].message.content

      history.push({ role: 'assistant', content: reply })
      if (history.length > MAX_HISTORY) history.splice(0, 2)
      await saveHistory(senderJid, history)

      await sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  🤖  Z Ξ R O  A I\n╚══════════════════════╝\n\n${reply}\n\n— *${config.botName}*`
      })

    } catch (err) {
      console.error('[AI ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    } finally {
      await sock.sendPresenceUpdate('available', jid)
    }
  }
}