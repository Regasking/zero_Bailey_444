import { config } from '../../config.js'

export default {
  name: 'groupinfo',
  alias: ['ginfo', 'groupe'],
  desc: 'Infos détaillées du groupe',
  category: 'group',
  groupOnly: true,

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const meta = await sock.groupMetadata(jid)

    const total = meta.participants.length
    const admins = meta.participants.filter(p => p.admin)
    const superAdmins = meta.participants.filter(p => p.admin === 'superadmin')
    const members = total - admins.length
    const created = new Date(meta.creation * 1000)

    const createdStr = created.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

    const restrict = meta.restrict ? '🔒 Admins seulement' : '🌐 Tout le monde'
    const announce = meta.announce ? '🔒 Admins seulement' : '🌐 Tout le monde'

    const adminList = admins.length
      ? admins.map(a => `  ▸ @${a.id.split('@')[0]}`).join('\n')
      : '  ▸ Aucun'

    await sock.sendMessage(jid, {
      text: `╔══════════════════════╗\n  📋  G R O U P E  I N F O\n╚══════════════════════╝\n\n📌 *Nom :* ${meta.subject}\n📅 *Créé le :* ${createdStr}\n\n👥 *Membres :* ${total}\n  ▸ Admins : ${admins.length}\n  ▸ Super admins : ${superAdmins.length}\n  ▸ Membres : ${members}\n\n👑 *Admins :*\n${adminList}\n\n⚙️ *Paramètres :*\n  ▸ Modifier groupe : ${restrict}\n  ▸ Envoyer messages : ${announce}\n\n🆔 *ID :*\n\`${jid}\`\n\n— *${config.botName}*`,
      mentions: admins.map(a => a.id)
    })
  }
}