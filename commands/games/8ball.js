import { config } from '../../config.js'

const responses = [
  // Positifs arrogants
  { text: 'Oui. Évidemment. Pourquoi tu doutais ?', type: '🟢' },
  { text: 'Absolument. Et je n\'avais même pas besoin d\'y réfléchir.', type: '🟢' },
  { text: 'Oui. Mais tu aurais pu trouver tout seul si tu réfléchissais un peu.', type: '🟢' },
  { text: 'C\'est certain. L\'univers est au moins d\'accord avec moi sur ça.', type: '🟢' },
  { text: 'Les signes pointent vers oui. Comme toujours quand je réponds.', type: '🟢' },

  // Négatifs arrogants
  { text: 'Non. Et franchement, tu savais déjà la réponse.', type: '🔴' },
  { text: 'Certainement pas. Et tu devrais en être soulagé.', type: '🔴' },
  { text: 'Non. Passe à autre chose.', type: '🔴' },
  { text: 'Pas dans cette vie. Ni dans la prochaine.', type: '🔴' },
  { text: 'Ma réponse est non. Définitif. Irrévocable. Accepte-le.', type: '🔴' },

  // Neutres arrogants
  { text: 'Peut-être. Mais je ne perdrai pas mon temps à spéculer.', type: '🟡' },
  { text: 'Flou. Comme ta question d\'ailleurs.', type: '🟡' },
  { text: 'Concentre-toi et redemande. Tu manques de précision.', type: '🟡' },
  { text: 'Les perspectives sont... médiocres. Comme d\'habitude.', type: '🟡' },
  { text: 'Indéterminé. Ce qui est déjà une réponse de ma part.', type: '🟡' },
]

export default {
  name: '8ball',
  alias: ['boule', 'magic'],
  desc: 'Boule magique — version arrogante',
  category: 'games',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: `🎱 Tu veux une réponse mais t\'as pas posé de question.\nC\'est le genre de logique qui m\'épuise.\n\nUtilisation : \`${config.prefix}8ball <question>\``
      }, { quoted: msg })
    }

    const question = args.join(' ')
    const pick = responses[Math.floor(Math.random() * responses.length)]

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  🎱  B O U L E  M A G I Q U E\n╚══════════════════════╝\n\n❓ _${question}_\n\n${pick.type} *${pick.text}*\n\n— *${config.botName}* | _J'ai toujours raison._`
    }, { quoted: msg })
  }
}