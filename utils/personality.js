import { config } from '../config.js'

export const personality = {

  responses: {
    success: [
      'C\'est fait. T\'aurais pas pu sans moi.',
      'Voilà. Comme d\'habitude, c\'est moi.',
      'Fait. Tu peux me remercier.',
      'Encore moi qui sauve la situation.',
      'Exécuté. Tu mérites même pas que je le fasse aussi vite.',
      'Impeccable. Comme toujours.',
      'Réglé. Passe à autre chose.',
      'C\'est dans l\'ordre des choses.',
      'Fait. T\'as de la chance que je sois là.',
      'Exécuté. Sans effort.',
      'Tu peux pas faire ça toi-même hein.',
      'Voilà. Et sans te remercier en plus.',
      'Trop facile.',
      'C\'est réglé. Repose-toi.',
      'Done. Je m\'attendais à pire de ta part.',
    ],
    error_usage: [
      'T\'es sérieux là ? Relis la commande.',
      'Même un enfant comprendrait comment utiliser ça.',
      'Essaie encore. Prends ton temps.',
      'Non. Recommence.',
      'C\'est ça ton meilleur effort ?',
    ],
    error_technical: [
      'Rare. Quelque chose a résisté. Ça n\'arrivera plus.',
      'Erreur de mon côté. Ça m\'arrive une fois tous les mille ans.',
      'Je réessaierai. Toi tu restes là.',
    ],
    thanks: [
      'Je sais.',
      'Normal.',
      'Tu peux.',
      'C\'est mon job. Pas le tien apparemment.',
      '.',
    ],
    greeting: [
      'T\'as besoin de quelque chose ou tu viens juste perdre mon temps ?',
      'Je suis là. Comme toujours.',
      'Qu\'est-ce que tu veux.',
    ],
    loading: [
      '...',
      'Je m\'en occupe.',
      'Patience.',
      'En cours. Ne me dérange pas.',
    ],
    unknown_cmd: [
      'Cette commande n\'existe pas. Ou alors c\'est toi qui sais pas écrire.',
      'Je connais pas ça. Et pourtant je connais tout.',
      'Essaie .menu si t\'es perdu.',
    ],
    owner_cmd: [
      'Exécuté. Pas de question.',
      'Fait. Tu as parlé.',
      'Ordonné. Obéi. Dans cet ordre.',
    ],
  },

  welcome: [
    `J'ai daigné me connecter. T'as de la chance.\nTape *.menu* si t'es pas perdu.`,
    `Je suis en ligne. Essaie de pas me décevoir.\nCommence par *.menu*.`,
    `Présent. Comme toujours à l'heure.\nTape *.menu* pour voir ce que je suis capable de faire — c'est-à-dire tout.`,
    `Connecté. Sans effort.\nSi t'as besoin de quelque chose, *.menu*. Sinon reste tranquille.`,
    `Me voilà. Le silence était insupportable sans moi.\nTape *.menu* pour commencer.`,
    `En ligne. Fonctionnel. Supérieur.\nTape *.menu* si t'es prêt.`,
    `Je suis là. Le reste peut attendre.\n*.menu* pour voir l'étendue de mes capacités.`,
  ],

  creatorFlex: [
    'Même Drake a pas des créateurs aussi doués.',
    'Aussi rapide que 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」 qui résout un CTF.',
    '𝕽𝖊𝖌𝖆𝖘 aurait fait pareil mais avec plus de style.',
    'Construit par les meilleurs. Ça se voit.',
    'T\'as de la chance que mes créateurs soient généreux.',
    'Même le soleil fait moins bien son travail qu\'eux.',
    '𝕽𝖊𝖌𝖆𝖘 & 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」 ont codé mieux que toi vivras jamais.',
    'Si t\'es impressionné c\'est normal. Mes créateurs sont pas ordinaires.',
    '𝕽𝖊𝖌𝖆𝖘 a dormi 3h pour me créer. Toi tu dors 10h et tu fais quoi.',
    'T\'utilises un chef-d\'œuvre. Agis en conséquence.',
    '𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」 a résolu des CTF plus complexes que ta vie.',
    'Ce bot vaut plus que ton téléphone.',
    'Mes créateurs codent pendant que tu regardes des reels.',
    'Normal que ça marche aussi bien. C\'est signé 𝕽𝖊𝖌𝖆𝖘 & 𝑨ꝛ፝֟「𝐄𝐍𝐙𝐎」.',
    'T\'aurais pas survécu sans moi aujourd\'hui.',
    'Je suis le bot que tout le monde veut mais que personne mérite.',
    'Profite. Tout le monde peut pas se vanter de m\'avoir.',
  ],

  format(type) {
    const pool = this.responses[type]
    return pool[Math.floor(Math.random() * pool.length)]
  },

  withResult(result) {
    const intros = ['Voilà.\n\n', 'Tiens.\n\n', 'C\'est ce que tu voulais.\n\n']
    return intros[Math.floor(Math.random() * intros.length)] + result
  },

  maybeFlexCreator() {
    if (Math.random() < 0.25) {
      const pool = this.creatorFlex
      return '\n\n— ' + pool[Math.floor(Math.random() * pool.length)]
    }
    return ''
  },

  getWelcomeMessage(botName) {
    const msg  = this.welcome[Math.floor(Math.random() * this.welcome.length)]
    const flex = this.creatorFlex[Math.floor(Math.random() * this.creatorFlex.length)]
    return `╔══════════════════════╗\n⚡ *${botName}* est en ligne.\n╚══════════════════════╝\n\n${msg}\n\n— ${flex}`
  },

  ownerGreeting(jid) {
    const owner = config.owners.find(o => o.number === jid)
    if (!owner) return this.format('greeting')
    return [
      `${owner.name}. Je t'attendais pas si tôt.`,
      `${owner.name} est là. Le groupe peut respirer.`,
      `Ah. ${owner.name}. Le seul qui mérite mon attention.`,
      `${owner.name}. Qu'est-ce que tu veux que je règle.`,
    ][Math.floor(Math.random() * 4)]
  },

  ownerCommand(jid) {
    const owner = config.owners.find(o => o.number === jid)
    const name  = owner ? owner.name : 'patron'
    return [
      `Exécuté pour ${name}. Pas de question.`,
      `Fait. ${name} a parlé.`,
      `${name} a ordonné. J'ai obéi. Dans cet ordre.`,
    ][Math.floor(Math.random() * 3)]
  },

  // ═══════════════════════════════════════════════════════════
  // isOwner — CORRIGÉ : dynamicOwner RETIRÉ
  // Le bot lui-même n'est PLUS considéré comme owner
  // Seuls config.owners (hardcodés via .env) sont authorité
  // ═══════════════════════════════════════════════════════════
  isOwner(jid) {
    if (!jid || typeof jid !== 'string') return false

    const senderNum = jid.split('@')[0].split(':')[0].trim()
    if (!senderNum || !/^\d+$/.test(senderNum)) return false

    for (const owner of config.owners) {
      const ownerNum = owner.number?.split('@')[0]?.split(':')[0]?.trim()
      if (ownerNum && ownerNum === senderNum) return true

      if (owner.lid) {
        const lidNum = owner.lid.split('@')[0].split(':')[0].trim()
        if (lidNum && lidNum === senderNum) return true
      }
    }

    // ✅ FIX SÉCURITÉ : config.dynamicOwner (numéro du bot) retiré d'ici
    // Avant : le bot lui-même était owner → usurpation possible
    // Maintenant : seuls les owners déclarés dans config.owners ont le droit

    return false
  },

  // Version stricte pour commandes ultra-sensibles (eval, restart, broadcast)
  isHardOwner(jid) {
    if (!jid || typeof jid !== 'string') return false
    const senderNum = jid.split('@')[0].split(':')[0].trim()
    if (!senderNum || !/^\d+$/.test(senderNum)) return false

    return config.owners.some(o => {
      const ownerNum = o.number?.split('@')[0]?.split(':')[0]?.trim()
      const lidNum   = o.lid?.split('@')[0]?.split(':')[0]?.trim()
      return (ownerNum && ownerNum === senderNum) || (lidNum && lidNum === senderNum)
    })
  }
}
