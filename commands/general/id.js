export default {
  name: 'id',
  alias: ['myid'],
  desc: 'Ton ID WhatsApp',
  category: 'general',

  async execute(sock, msg, args, { senderJid }) {
    const jid = msg.key.remoteJid
    await sock.sendMessage(jid, {
      text: `🆔 *Ton ID :*\n${senderJid}\n\n— Garde ça. Tu sais jamais.`
    })
  }
}