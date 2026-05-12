import fetch from 'node-fetch'
import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

const activeSessions = new Map()

const themes = {
  foot: 'football et sport',
  science: 'sciences et technologie',
  histoire: 'histoire mondiale',
  culture: 'culture générale',
  musique: 'musique et artistes',
  geo: 'géographie mondiale',
  anime: 'anime et manga',
  hack: 'cybersécurité et hacking éthique',
  code: 'programmation et développement',
}

const difficulties = {
  facile: 'très simples, niveau collège',
  moyen: 'modérées, niveau lycée',
  difficile: 'difficiles, niveau expert',
}

async function generateQuestions(theme, difficulty, count) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apis.mistral}`,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Génère exactement ${count} questions de quiz sur le thème "${theme}".
Niveau de difficulté : ${difficulty}.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, avec ce format exact :
[
  {
    "question": "La question ici ?",
    "answer": "la réponse correcte en minuscules",
    "hint": "un indice court"
  }
]`,
        },
      ],
    }),
  })

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim() || ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

export default {
  name: 'quiz',
  alias: ['quizz'],
  desc: 'Quiz IA avec thème et difficulté',
  category: 'games',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (activeSessions.has(jid)) {
      const session = activeSessions.get(jid)

      if (!args.length) {
        return sock.sendMessage(jid, {
          text: `Une session est déjà active. Réponds avec .quiz <ta réponse>, ou .quiz hint / stop.`
        })
      }

      const command = args[0].toLowerCase()
      if (command === 'stop') {
        activeSessions.delete(jid)
        return sock.sendMessage(jid, {
          text: `🛑 Quiz arrêté.

📊 *Score final :* ${session.score}/${session.current} points`
        })
      }

      if (command === 'hint') {
        const q = session.questions[session.current]
        return sock.sendMessage(jid, {
          text: `💡 *Indice :* ${q.hint}`
        })
      }

      const userAnswer = args.join(' ').toLowerCase().trim()
      const correctAnswer = session.questions[session.current].answer.toLowerCase()
      const isCorrect = userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer)

      if (isCorrect) {
        session.score++
        await sock.sendMessage(jid, {
          text: `✅ *Bonne réponse !* +1 point
🏆 Score : *${session.score}/${session.current + 1}*`
        })
      } else {
        await sock.sendMessage(jid, {
          text: `❌ *Mauvaise réponse.*
La bonne réponse était : *${session.questions[session.current].answer}*
🏆 Score : *${session.score}/${session.current + 1}*`
        })
      }

      session.current++

      if (session.current >= session.questions.length) {
        activeSessions.delete(jid)
        const percent = Math.round((session.score / session.questions.length) * 100)
        let comment = ''
        if (percent >= 80) comment = '🔥 Excellent !'
        else if (percent >= 60) comment = '👍 Pas mal.'
        else if (percent >= 40) comment = '😐 Moyen.'
        else comment = '💀 Catastrophique.'

        return sock.sendMessage(jid, {
          text: `🏁 *Quiz terminé !*
━━━━━━━━━━━━━━━━━━━━━
🏆 Score final : *${session.score}/${session.questions.length}*
📊 Pourcentage : *${percent}%*
${comment}
━━━━━━━━━━━━━━━━━━━━━
— ${personality.format('success')}`
        })
      }

      setTimeout(async () => {
        const nextQ = session.questions[session.current]
        await sock.sendMessage(jid, {
          text: `❓ *Question ${session.current + 1}/${session.questions.length}*
━━━━━━━━━━━━━━━━━━━━━
${nextQ.question}
━━━━━━━━━━━━━━━━━━━━━
_Tape .quiz hint pour un indice ou .quiz stop pour arrêter_`
        })
      }, 1500)

      return
    }

    const themeKey = args[0]?.toLowerCase()
    const diffKey = args[1]?.toLowerCase()
    const count = Math.min(Math.max(parseInt(args[2], 10) || 10, 10), 20)

    if (!themeKey || !themes[themeKey]) {
      const themeList = Object.keys(themes).join(', ')
      return sock.sendMessage(jid, {
        text: `🎮 *QUIZ IA*
━━━━━━━━━━━━━━━━━━━━━
*Utilisation :*
.quiz <thème> <difficulté> <nombre>

*Thèmes disponibles :*
${themeList}

*Difficultés :*
facile, moyen, difficile

*Nombre de questions :* 10-20

*Exemple :*
.quiz foot difficile 15`
      })
    }

    if (!diffKey || !difficulties[diffKey]) {
      return sock.sendMessage(jid, {
        text: `❌ Difficulté invalide.
Choix : *facile*, *moyen*, *difficile*`
      })
    }

    await sock.sendMessage(jid, {
      text: `🎮 *Génération du quiz en cours...*
📚 Thème : *${themeKey}*
⚡ Difficulté : *${diffKey}*
❓ Questions : *${count}*

${personality.format('loading')}`
    })

    try {
      const questions = await generateQuestions(themes[themeKey], difficulties[diffKey], count)

      activeSessions.set(jid, {
        questions,
        current: 0,
        score: 0,
        theme: themeKey,
        difficulty: diffKey,
      })

      const firstQ = questions[0]
      await sock.sendMessage(jid, {
        text: `🏁 *Quiz démarré !*
━━━━━━━━━━━━━━━━━━━━━
📚 *${themeKey.toUpperCase()}* — ${diffKey}
❓ *${count} questions*
━━━━━━━━━━━━━━━━━━━━━

*Question 1/${count}*
${firstQ.question}
━━━━━━━━━━━━━━━━━━━━━
_Réponds avec .quiz <ta réponse>_
_Indice : .quiz hint | Arrêter : .quiz stop_`
      })
    } catch (err) {
      console.error('[QUIZ ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  },
}
