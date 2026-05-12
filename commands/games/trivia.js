import { personality } from '../../utils/personality.js'

const questions = [
  { q: 'Quelle est la capitale de la France ?', a: 'paris', choices: ['Londres', 'Paris', 'Berlin', 'Madrid'] },
  { q: 'Combien de côtés a un hexagone ?', a: '6', choices: ['5', '6', '7', '8'] },
  { q: 'Quel est le plus grand océan du monde ?', a: 'pacifique', choices: ['Atlantique', 'Indien', 'Pacifique', 'Arctique'] },
  { q: 'Qui a peint la Joconde ?', a: 'léonard de vinci', choices: ['Picasso', 'Michel-Ange', 'Léonard de Vinci', 'Raphaël'] },
  { q: 'Quelle est la planète la plus proche du soleil ?', a: 'mercure', choices: ['Vénus', 'Terre', 'Mercure', 'Mars'] },
  { q: 'En quelle année a eu lieu la Révolution française ?', a: '1789', choices: ['1776', '1789', '1804', '1815'] },
]

const activeTrivia = new Map()

export default {
  name: 'trivia',
  alias: [],
  desc: 'Quiz culture générale',
  category: 'games',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    // Si réponse en cours
    if (activeTrivia.has(jid) && args.length) {
      const { answer, question } = activeTrivia.get(jid)
      const userAnswer = args.join(' ').toLowerCase()

      activeTrivia.delete(jid)

      if (userAnswer.includes(answer)) {
        return sock.sendMessage(jid, {
          text: `✅ *Bonne réponse !*\n\n${personality.format('success')}`
        })
      } else {
        return sock.sendMessage(jid, {
          text: `❌ *Mauvaise réponse.*\nLa bonne réponse était : *${answer}*`
        })
      }
    }

    const q = questions[Math.floor(Math.random() * questions.length)]
    activeTrivia.set(jid, { answer: q.a, question: q.q })

    const choices = q.choices.map((c, i) => `${i + 1}. ${c}`).join('\n')

    await sock.sendMessage(jid, {
      text: `🧠 *TRIVIA*\n━━━━━━━━━━━━━━━━━━━━━\n${q.q}\n\n${choices}\n━━━━━━━━━━━━━━━━━━━━━\n_Réponds avec .trivia <ta réponse>_`
    })

    // Auto-expiration après 30 secondes
    setTimeout(() => {
      if (activeTrivia.has(jid)) {
        activeTrivia.delete(jid)
        sock.sendMessage(jid, {
          text: `⏱️ Temps écoulé. La réponse était : *${q.a}*`
        })
      }
    }, 30000)
  }
}