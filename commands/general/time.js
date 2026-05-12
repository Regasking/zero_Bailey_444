export default {
  name: 'time',
  alias: ['date', 'heure'],
  desc: 'Heure et date actuelles',
  category: 'general',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const now = new Date()
    const heure = now.toLocaleTimeString('fr-FR')
    const date = now.toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric',
      month: 'long', day: 'numeric'
    })

    await sock.sendMessage(jid, {
      text: `🕐 *${heure}*\n📅 ${date}\n\n— L'heure tourne. Toi aussi.`
    })
  }
}