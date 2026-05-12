import { personality } from '../../utils/personality.js'

export const userXP = new Map()

export const addXP = (jid, amount = 1) => {
  const current = userXP.get(jid) || 0
  userXP.set(jid, current + amount)
}

const getLevel = (xp) => Math.floor(xp / 100) + 1

export default {
  name: 'rank',
  alias: ['level', 'xp', 'niveau'],
  desc: 'Ton niveau XP',
  category: 'games',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid
    const xp = userXP.get(senderJid) || 0
    const level = getLevel(xp)
    const nextLevel = level * 100
    const progress = Math.floor((xp % 100) / 100 * 10)
    const bar = '█'.repeat(progress) + '░'.repeat(10 - progress)

    await sock.sendMessage(jid, {
      text: `⭐ *Ton Rang*
━━━━━━━━━━━━━━━━━━━━━
👤 @${senderJid.split('@')[0]}
🏆 *Niveau :* ${level}
✨ *XP :* ${xp} / ${nextLevel}
📊 *Progression :* [${bar}]
━━━━━━━━━━━━━━━━━━━━━
_Continue à utiliser le bot pour gagner de l'XP._`,
      mentions: [senderJid]
    })
  }
}