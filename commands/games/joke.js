import { config } from '../../config.js'

const jokes = [
  'Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tomberaient dans le bateau.',
  'Un homme entre dans une bibliothèque et demande un livre sur le paradoxe. Le bibliothécaire dit : Nous l\'avons mais pas.',
  'Pourquoi Superman porte-t-il son slip par-dessus son collant ? Pour cacher sa Kryptonite.',
  'Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël.',
  'Qu\'est-ce qu\'un canif ? Un petit fien.',
  'Pourquoi les informaticiens confondent Halloween et Noël ? Parce que OCT 31 = DEC 25.',
  'Comment appelle-t-on un boomerang qui ne revient pas ? Un bâton.',
  'Qu\'est-ce qu\'un crocodile qui surveille la cour d\'école ? Un sac à dents.',
  'Pourquoi les canards sont toujours à l\'heure ? Parce qu\'ils sont dans l\'étang.',
  'Un homme entre dans un bar. Aïe.',
]

const reactions = [
  'Tu as ri ? Bien. Tu méritais quelque chose.',
  'Si tu as ri, c\'est que t\'as bon goût.',
  'Je sais. Je suis excellent dans tout ce que je fais.',
  'Même mes blagues sont supérieures.',
  'De rien. Tu peux m\'applaudir.',
  'Cette blague vaut mieux que ta journée.',
]

export default {
  name: 'joke',
  alias: ['blague', 'lol'],
  desc: 'Blague aléatoire',
  category: 'games',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const joke = jokes[Math.floor(Math.random() * jokes.length)]
    const reaction = reactions[Math.floor(Math.random() * reactions.length)]

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  😏  B L A G U E\n╚══════════════════════╝\n\n${joke}\n\n_"${reaction}"_\n\n— *${config.botName}*`
    })
  }
}