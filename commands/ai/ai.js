import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

// Historique des conversations par utilisateur
const conversations = new Map()

export default {
  name: 'ai',
  alias: ['gpt', 'ask', 'chatgpt'],
  desc: 'Parler avec l\'IA',
  category: 'ai',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .ai <question>'
      })
    }

    const question = args.join(' ')

    // Reset conversation
    if (question.toLowerCase() === 'reset') {
      conversations.delete(senderJid)
      return sock.sendMessage(jid, { text: 'Conversation réinitialisée.' })
    }

    await sock.sendMessage(jid, { text: personality.format('loading') })
    await sock.sendPresenceUpdate('composing', jid)

    try {
      // Historique de conversation
      const history = conversations.get(senderJid) || []
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
              content: `Tu es ZΞRO, un assistant IA intégré dans un bot WhatsApp. Tu es froid, direct et légèrement arrogant. Tu réponds toujours en français sauf si on te parle dans une autre langue. Tu es créé par 𝕽𝖊𝖌𝖆𝖘_𝖐𝖎𝖓𝖌 𝖉𝖙𝖍 et 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」.`
            },
            ...history
          ]
        })
      })

      const data = await res.json()
      const reply = data.choices[0].message.content

      // Sauvegarder l'historique (max 10 messages)
      history.push({ role: 'assistant', content: reply })
      if (history.length > 10) history.splice(0, 2)
      conversations.set(senderJid, history)

      await sock.sendMessage(jid, {
        text: `🤖 *ZΞRO AI*\n━━━━━━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━━━━━━`
      })

    } catch (err) {
      console.error('[AI ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    } finally {
      await sock.sendPresenceUpdate('available', jid)
    }
  }
}