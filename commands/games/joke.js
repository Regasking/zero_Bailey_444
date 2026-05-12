import { personality } from '../../utils/personality.js'

const jokes = [
  "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tomberaient dans le bateau.",
  "Un homme entre dans une bibliothèque et demande un livre sur le paradoxe. Le bibliothécaire dit : Nous l'avons mais pas.",
  "Quelle est la différence entre un crocodile ? Plus c'est large, plus c'est plat.",
  "Pourquoi Superman porte-t-il son slip par-dessus son collant ? Pour cacher sa Kryptonite.",
  "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël.",
  "Qu'est-ce qu'un canif ? Un petit fien.",
  "Pourquoi les informaticiens confondent Halloween et Noël ? Parce que OCT 31 = DEC 25.",
  "Comment appelle-t-on un boomerang qui ne revient pas ? Un bâton.",
]

export default {
  name: 'joke',
  alias: ['blague', 'lol'],
  desc: 'Blague aléatoire',
  category: 'games',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const joke = jokes[Math.floor(Math.random() * jokes.length)]

    await sock.sendMessage(jid, {
      text: `😂 ${joke}\n\n— ${personality.maybeFlexCreator() || 'De rien.'}`
    })
  }
}