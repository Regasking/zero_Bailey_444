import { userXP } from './rank.js'

export default {
  name: 'leaderboard',
  alias: ['top', 'classement'],
  desc: 'Classement du groupe',
  category: 'games',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid

    if (userXP.size === 0) {
      return sock.sendMessage(jid, {
        text: 'Aucun classement disponible. Utilisez les commandes pour gagner de l\'XP.'
      })
    }

    const sorted = [...userXP.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const medals = ['🥇', '🥈', '🥉']
    let text = '🏆 *Classement*\n━━━━━━━━━━━━━━━━━━━━━\n'

    sorted.forEach(([jid, xp], i) => {
      const medal = medals[i] || `${i + 1}.`
      const level = Math.floor(xp / 100) + 1
      text += `${medal} @${jid.split('@')[0]} — Nv.${level} (${xp} XP)\n`
    })

    text += '━━━━━━━━━━━━━━━━━━━━━'

    await sock.sendMessage(jid, {
      text,
      mentions: sorted.map(([jid]) => jid)
    })
  }
}