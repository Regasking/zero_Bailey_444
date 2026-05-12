export default {
  name: 'groupinfo',
  alias: ['ginfo', 'groupe'],
  desc: 'Infos du groupe',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const meta = await sock.groupMetadata(jid)
    const admins = meta.participants.filter(p => p.admin).length

    await sock.sendMessage(jid, {
      text: `📋 *Infos du groupe*
━━━━━━━━━━━━━━━━━━━━━
📌 *Nom :* ${meta.subject}
👥 *Membres :* ${meta.participants.length}
👑 *Admins :* ${admins}
📅 *Créé le :* ${new Date(meta.creation * 1000).toLocaleDateString('fr-FR')}
🔗 *ID :* ${jid}
━━━━━━━━━━━━━━━━━━━━━`
    })
  }
}