const actions = [
  'Envoie un message vocal en chantant.',
  'Change ton nom WhatsApp pendant 1 heure.',
  'Envoie ton dernier screenshot.',
  'Fais 20 pompes et envoie une vidéo.',
  'Envoie un message à quelqu\'un que t\'as pas contacté depuis 1 mois.',
  'Imite quelqu\'un dans le groupe en vocal.',
  'Envoie ta photo de profil actuelle.',
  'Écris un poème sur quelqu\'un dans le groupe.',
]

const truths = [
  'Qui est ton crush dans ce groupe ?',
  'Quel est ton plus grand secret ?',
  'Quelle est la chose la plus embarrassante que t\'as faite ?',
  'Tu as déjà menti à un ami proche ?',
  'Quelle est ta pire habitude ?',
  'Qui dans le groupe tu bloquerais en premier ?',
  'Quel est ton vrai avis sur le groupe ?',
  'Tu as déjà trahi quelqu\'un ? Comment ?',
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
        text: `🎯 *ACTION*\n━━━━━━━━━━━━━━━━━━━━━\n${action}\n━━━━━━━━━━━━━━━━━━━━━\n_Tu peux pas refuser._`
      })
    }

    if (type === 'verite' || type === 'truth') {
      const truth = truths[Math.floor(Math.random() * truths.length)]
      return sock.sendMessage(jid, {
        text: `💭 *VÉRITÉ*\n━━━━━━━━━━━━━━━━━━━━━\n${truth}\n━━━━━━━━━━━━━━━━━━━━━\n_Réponds honnêtement._`
      })
    }

    await sock.sendMessage(jid, {
      text: `🎮 *Action ou Vérité*\n\n▸ .dare action — Reçois une action\n▸ .dare verite — Reçois une vérité`
    })
  }
}