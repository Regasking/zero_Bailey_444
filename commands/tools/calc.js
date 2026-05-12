import { personality } from '../../utils/personality.js'

export default {
  name: 'calc',
  alias: ['calculatrice', 'math'],
  desc: 'Calculatrice',
  category: 'tools',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .calc <expression>'
      })
    }

    try {
      const expression = args.join(' ')
      // Sécuriser l'évaluation
      const sanitized = expression.replace(/[^0-9+\-*/.()% ]/g, '')
      const result = Function(`"use strict"; return (${sanitized})`)()

      await sock.sendMessage(jid, {
        text: `🧮 *${expression}*\n= *${result}*\n\n— ${personality.format('success')}`
      })
    } catch {
      await sock.sendMessage(jid, {
        text: personality.format('error_technical') + '\n\nExpression invalide.'
      })
    }
  }
}