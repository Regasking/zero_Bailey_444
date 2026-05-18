import { personality } from '../../utils/personality.js'
import { sendSanction } from '../../utils/sanctionImage.js'
import { config } from '../../config.js'

export default {
  name: 'kick',
  alias: ['remove', 'ban', 'kickall'],
  desc: 'Exclure un membre ou tous les membres',
  category: 'group',
  groupOnly: true,
  adminOnly: true,

  async execute(sock, msg, args, { isOwner, senderJid }) {
    const jid = msg.key.remoteJid

    // Vérifier admin
    const meta = await sock.groupMetadata(jid).catch(() => null)
    if (!meta) return sock.sendMessage(jid, { text: `❌ Impossible de récupérer les infos du groupe.` })

    const senderIsAdmin = meta.participants.some(
      p => (p.id === senderJid || p.jid === senderJid) &&
           (p.admin === 'admin' || p.admin === 'superadmin')
    )
    if (!isOwner && !senderIsAdmin) {
      return sock.sendMessage(jid, { text: `🚫 Admins seulement.` })
    }

    const botJid = sock.user?.id?.replace(/:\d+/, '') + '@s.whatsapp.net'

    // ── .kick all ──────────────────────────────────────────────
    const cmdName = msg.message?.conversation?.split(' ')[0]?.slice(1)?.toLowerCase()
      || msg.message?.extendedTextMessage?.text?.split(' ')[0]?.slice(1)?.toLowerCase()

    if (args[0]?.toLowerCase() === 'all' || cmdName === 'kickall') {

      // Confirmation obligatoire
      if (args[1]?.toLowerCase() !== 'confirm') {
        return sock.sendMessage(jid, {
          text: `╔══════════════════════╗\n  ⚠️  K I C K  A L L\n╚══════════════════════╝\n\n*${meta.participants.length} membres* vont être expulsés.\n\n⚠️ Cette action est *irréversible*.\n\nPour confirmer :\n*${config.prefix}kick all confirm*\n\n— *${config.botName}*`
        })
      }

      // Collecter les membres à kick (pas les admins, pas le bot)
      const toKick = meta.participants.filter(p => {
        const pid = p.id || p.jid
        return pid !== botJid
          && pid !== senderJid
          && p.admin !== 'admin'
          && p.admin !== 'superadmin'
      }).map(p => p.id || p.jid)

      if (!toKick.length) {
        return sock.sendMessage(jid, { text: `ℹ️ Aucun membre à expulser (seuls les admins restants).` })
      }

      await sock.sendMessage(jid, {
        text: `⏳ Expulsion de *${toKick.length}* membres en cours...`
      })

      let success = 0
      let failed  = 0

      for (const member of toKick) {
        try {
          await sock.groupParticipantsUpdate(jid, [member], 'remove')
          success++
          await new Promise(r => setTimeout(r, 800))
        } catch {
          failed++
        }
      }

      return sendSanction(sock, jid, `╔══════════════════════╗\n  ✅  K I C K  A L L\n╚══════════════════════╝\n\n▸ Expulsés : *${success}*\n▸ Échecs : *${failed}*\n\n— *${config.botName}* | _${personality.format('owner_cmd')}_`)
    }

    // ── .kick @mention / reply ─────────────────────────────────
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant
      || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

    if (!target) {
      return sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  🦵  K I C K\n╚══════════════════════╝\n\n*Utilisation :*\n▸ ${config.prefix}kick @membre — Exclure un membre\n▸ ${config.prefix}kick all — Exclure tout le monde\n\nOu reply sur le message d'un membre.\n\n— *${config.botName}*`
      })
    }

    // Empêcher de kick un admin
    const targetParticipant = meta.participants.find(p => p.id === target || p.jid === target)
    if (targetParticipant?.admin) {
      return sock.sendMessage(jid, { text: `❌ Tu ne peux pas expulser un administrateur.` })
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], 'remove')
      await sendSanction(sock, jid, `✅ @${target.split('@')[0]} expulsé.\n\n— ${personality.format('owner_cmd')}`, { quoted: msg, mentions: [target] })
    } catch {
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}