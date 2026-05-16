import { config } from '../../config.js'

const actions = [
  'Envoie un message vocal en chantant. Maintenant.',
  'Change ton nom WhatsApp pendant 1 heure. Et assume.',
  'Envoie ton dernier screenshot. Celui que t\'aurais pas voulu montrer.',
  'Fais 20 pompes et envoie une vidéo. Ou avoue que tu peux pas.',
  'Envoie un message à quelqu\'un que t\'as pas contacté depuis 1 mois.',
  'Imite quelqu\'un dans le groupe en vocal. Sans te défiler.',
  'Envoie ta vraie photo de profil. Pas celle du personnage anime.',
  'Écris un poème sur quelqu\'un dans le groupe. Un vrai.',
  'Envoie le dernier mème que t\'as sauvegardé.',
  'Appelle quelqu\'un du groupe maintenant. En direct.',
]

const truths = [
  'Qui est ton crush dans ce groupe ? Et sois honnête.',
  'Quel est ton plus grand secret que personne ici ne sait ?',
  'Quelle est la chose la plus embarrassante que t\'as faite récemment ?',
  'Tu as déjà menti à ton meilleur ami ? Sur quoi ?',
  'Quelle est ta pire habitude que tu caches ?',
  'Qui dans ce groupe tu supportes le moins ? Dis un nom.',
  'Quel est ton vrai avis sur ce groupe ? La vérité.',
  'Tu as déjà trahi quelqu\'un de confiance ? Comment ?',
  'Quelle chose tu regrettes le plus cette année ?',
  'Quel est le message le plus gênant de ta galerie ?',
]

export default {
  name: 'dare',
  alias: ['truth', 'actionverite', 'av'],
  desc: 'Action ou Vérité',
  category: 'games',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const type = args[0]?.toLowerCase()

    if (type === 'action' || type === 'dare') {
      const action = actions[Math.floor(Math.random() * actions.length)]
      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  🎯  A C T I O N\n╚══════════════════════╝\n\n${action}\n\n_Tu peux pas refuser. C\'est les règles._\n\n— *${config.botName}*`
      })
    }

    if (type === 'verite' || type === 'truth') {
      const truth = truths[Math.floor(Math.random() * truths.length)]
      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  💭  V É R I T É\n╚══════════════════════╝\n\n${truth}\n\n_Réponds honnêtement. Je sais quand tu mens._\n\n— *${config.botName}*`
      })
    }

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  🎮  A C T I O N  /  V É R I T É\n╚══════════════════════╝\n\n▸ \`${config.prefix}dare action\` — Reçois une action\n▸ \`${config.prefix}dare verite\` — Reçois une vérité\n\n_Choisis. Si t\'oses._\n\n— *${config.botName}*`
    })
  }
}