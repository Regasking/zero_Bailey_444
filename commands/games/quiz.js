import fetch from 'node-fetch'
import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

const activeSessions = new Map()
const TIMEOUT_MS = 30 * 1000 // 30 secondes par question

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
      messages: [{
        role: 'user',
        content: `Génère exactement ${count} questions de quiz sur le thème "${theme}".\nNiveau de difficulté : ${difficulty}.\nRéponds UNIQUEMENT en JSON valide, sans texte avant ou après :\n[\n  {\n    "question": "La question ici ?",\n    "answer": "la réponse correcte en minuscules",\n    "hint": "un indice court"\n  }\n]`
      }]
    }),
  })
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim() || ''
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

function startTimeout(sock, jid, session) {
  // Clear ancien timeout
  if (session.timeout) clearTimeout(session.timeout)

  session.timeout = setTimeout(async () => {
    if (!activeSessions.has(jid)) return
    const q = session.questions[session.current]
    await sock.sendMessage(jid, {
      text: `⏰ *Temps écoulé !*\nLa réponse était : *${q.answer}*`
    })
    session.current++

    if (session.current >= session.questions.length) {
      activeSessions.delete(jid)
      return sendFinalScore(sock, jid, session)
    }

    activeSessions.set(jid, session)
    await sendNextQuestion(sock, jid, session)
  }, TIMEOUT_MS)
}

async function sendNextQuestion(sock, jid, session) {
  const q = session.questions[session.current]
  const secs = TIMEOUT_MS / 1000
  await sock.sendMessage(jid, {
    text: `❓ *Question ${session.current + 1}/${session.questions.length}*\n━━━━━━━━━━━━━━━━━━━━━\n${q.question}\n━━━━━━━━━━━━━━━━━━━━━\n⏱️ _${secs} secondes pour répondre_\n_Tape_ \`${config.prefix}quiz hint\` _pour un indice_`
  })
  startTimeout(sock, jid, session)
}

async function sendFinalScore(sock, jid, session) {
  // Classement joueurs
  const players = Object.entries(session.players)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const medals = ['🥇', '🥈', '🥉']
  let podium = players.length
    ? players.map(([num, pts], i) => `${medals[i] || `${i + 1}.`} @${num.split('@')[0]} — *${pts} pts*`).join('\n')
    : 'Personne a répondu correctement. Décevant.'

  const mentions = players.map(([j]) => j)
  const percent = session.score > 0 ? Math.round((session.score / session.questions.length) * 100) : 0
  let comment = percent >= 80 ? '🔥 Excellent !' : percent >= 60 ? '👍 Pas mal.' : percent >= 40 ? '😐 Moyen.' : '💀 Catastrophique.'

  await sock.sendMessage(jid, {
    text: `╔══════════════════════╗\n  🏁  F I N  D U  Q U I Z\n╚══════════════════════╝\n\n📊 *${session.score}/${session.questions.length}* bonnes réponses — ${percent}% ${comment}\n\n🏆 *Classement :*\n${podium}\n\n— *${config.botName}*`,
    mentions
  })
}

export default {
  name: 'quiz',
  alias: ['quizz'],
  desc: 'Quiz IA avec thème, difficulté et classement',
  category: 'games',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid

    // ─── Session active : traite la réponse ───────────────────────────
    if (activeSessions.has(jid)) {
      const session = activeSessions.get(jid)

      if (!args.length) {
        return sock.sendMessage(jid, {
          text: `Un quiz est en cours. Réponds avec \`${config.prefix}quiz <réponse>\`, \`${config.prefix}quiz hint\` ou \`${config.prefix}quiz stop\`.`
        })
      }

      const cmd = args[0].toLowerCase()

      if (cmd === 'stop') {
        if (session.timeout) clearTimeout(session.timeout)
        activeSessions.delete(jid)
        return sendFinalScore(sock, jid, session)
      }

      if (cmd === 'hint') {
        const q = session.questions[session.current]
        return sock.sendMessage(jid, { text: `💡 *Indice :* ${q.hint}` })
      }

      // ─── Anti-triche : un joueur ne peut répondre qu'une fois par question ──
      const questionKey = `${senderJid}:${session.current}`
      if (session.answered?.has(questionKey)) {
        return sock.sendMessage(jid, {
          text: `Tu as déjà répondu à cette question.`,
        }, { quoted: msg })
      }
      if (!session.answered) session.answered = new Set()
      session.answered.add(questionKey)

      const userAnswer = args.join(' ').toLowerCase().trim()
      const correctAnswer = session.questions[session.current].answer.toLowerCase()
      const isCorrect = userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer)

      if (isCorrect) {
        session.score++
        if (!session.players) session.players = {}
        session.players[senderJid] = (session.players[senderJid] || 0) + 1

        if (session.timeout) clearTimeout(session.timeout)

        await sock.sendMessage(jid, {
          text: `✅ *@${senderJid.split('@')[0]} a trouvé !* +1 point\n🏆 Score global : *${session.score}/${session.current + 1}*`,
          mentions: [senderJid]
        })

        session.current++
        if (session.current >= session.questions.length) {
          activeSessions.delete(jid)
          return sendFinalScore(sock, jid, session)
        }

        activeSessions.set(jid, session)
        setTimeout(() => sendNextQuestion(sock, jid, session), 1500)
      } else {
        await sock.sendMessage(jid, {
          text: `❌ Mauvaise réponse @${senderJid.split('@')[0]}.`,
          mentions: [senderJid]
        })
      }
      return
    }

    // ─── Démarrer un nouveau quiz ──────────────────────────────────────
    const themeKey = args[0]?.toLowerCase()
    const diffKey = args[1]?.toLowerCase()
    const count = Math.min(Math.max(parseInt(args[2], 10) || 10, 5), 20)

    if (!themeKey || !themes[themeKey]) {
      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  🎮  Q U I Z  I A\n╚══════════════════════╝\n\n*Utilisation :*\n${config.prefix}quiz <thème> <difficulté> <questions>\n\n*Thèmes :*\n${Object.keys(themes).join(', ')}\n\n*Difficultés :*\nfacile, moyen, difficile\n\n*Questions :* 5-20\n\n*Exemple :*\n${config.prefix}quiz foot difficile 15\n\n— *${config.botName}*`
      })
    }

    if (!diffKey || !difficulties[diffKey]) {
      return sock.sendMessage(jid, {
        text: `❌ Difficulté invalide.\nChoix : *facile*, *moyen*, *difficile*`
      })
    }

    await sock.sendMessage(jid, {
      text: `🎮 Génération du quiz...\n📚 *${themeKey}* — ${diffKey} — ${count} questions\n\n${personality.format('loading')}`
    })

    try {
      const questions = await generateQuestions(themes[themeKey], difficulties[diffKey], count)

      const session = {
        questions,
        current: 0,
        score: 0,
        players: {},
        answered: new Set(),
        timeout: null,
        theme: themeKey,
        difficulty: diffKey,
      }

      activeSessions.set(jid, session)

      await sock.sendMessage(jid, {
        text: `🏁 *Quiz démarré !*\n━━━━━━━━━━━━━━━━━━━━━\n📚 *${themeKey.toUpperCase()}* — ${diffKey} — ${count} questions\n⏱️ *${TIMEOUT_MS / 1000}s* par question\n━━━━━━━━━━━━━━━━━━━━━`
      })

      await sendNextQuestion(sock, jid, session)
    } catch (err) {
      console.error('[QUIZ ERROR]', err)
      activeSessions.delete(jid)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}