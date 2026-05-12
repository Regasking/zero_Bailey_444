import { personality } from '../../utils/personality.js'

const groupRules = new Map()

export default {
  name: 'rules',
  alias: ['regles'],
  desc: 'Règles du groupe',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg, args, { isOwner }) {
    const jid = msg.key.remoteJid

    if (args[0] === 'set' && isOwner) {
      const rules = args.slice(1).join(' ')
      if (!rules) {
        return sock.sendMessage(jid, {
          text: 'Utilisation : .rules set <règles>'
        })
      }
      groupRules.set(jid, rules)
      return sock.sendMessage(jid, {
        text: `✅ Règles définies.\n\n— ${personality.format('success')}`
      })
    }

    const rules = groupRules.get(jid)
    if (!rules) {
      return sock.sendMessage(jid, {
        text: 'Aucune règle définie.\n\nAdmin : .rules set <règles>'
      })
    }

    await sock.sendMessage(jid, {
      text: `📋 *Règles du groupe*\n━━━━━━━━━━━━━━━━━━━━━\n${rules}\n━━━━━━━━━━━━━━━━━━━━━`
    })
  }
}