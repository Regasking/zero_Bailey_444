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
    const name = owner ? owner.name : 'patron'
    return [
      `Exécuté pour ${name}. Pas de question.`,
      `Fait. ${name} a parlé.`,
      `${name} a ordonné. J'ai obéi. Dans cet ordre.`,
    ][Math.floor(Math.random() * 3)]
  },

  // ═══════════════════════════════════════════════════════════
  // isOwner — vérification renforcée
  // Règles de sécurité :
  // 1. Le numéro doit être non vide et purement numérique (ou LID valide)
  // 2. Comparaison stricte — pas de includes/startsWith
  // 3. Le dynamicOwner (bot lui-même) est owner mais PAS les sudos non déclarés
  // 4. Un JID vide ou malformé = refus systématique
  // ═══════════════════════════════════════════════════════════
  isOwner(jid) {
    if (!jid || typeof jid !== 'string') return false

    // Extraire le numéro brut (sans @s.whatsapp.net, sans :device)
    const senderNum = jid.split('@')[0].split(':')[0].trim()

    // Refuser les JIDs vides ou non numériques (sauf LID qui peut avoir des chiffres longs)
    if (!senderNum || !/^\d+$/.test(senderNum)) return false

    // ── 1. Owners fixes déclarés dans config (source de vérité principale) ──
    for (const owner of config.owners) {
      const ownerNum = owner.number?.split('@')[0]?.split(':')[0]?.trim()
      if (ownerNum && ownerNum === senderNum) return true

      // LID fixe déclaré
      if (owner.lid) {
        const lidNum = owner.lid.split('@')[0].split(':')[0].trim()
        if (lidNum && lidNum === senderNum) return true
      }
    }

    // ── 2. Numéro dynamique du bot connecté (bot = owner de lui-même) ──
    if (config.dynamicOwner) {
      const dynamicNum = config.dynamicOwner.split('@')[0].split(':')[0].trim()
      if (dynamicNum && dynamicNum === senderNum) return true
    }

    // ── 3. LID connecté dynamiquement ──────────────────────────────────
    if (config.connectedLid) {
      const lidNum = config.connectedLid.split('@')[0].split(':')[0].trim()
      // Vérification supplémentaire : le LID connecté doit correspondre
      // à un owner déclaré pour éviter qu'un LID inconnu devienne owner
      const lidBelongsToOwner = config.owners.some(o => {
        const ownerNum = o.number?.split('@')[0]?.split(':')[0]?.trim()
        return ownerNum && config.dynamicOwner?.startsWith(ownerNum)
      })
      if (lidBelongsToOwner && lidNum && lidNum === senderNum) return true
    }

    return false
  },

  // Version stricte pour commandes ultra-sensibles (eval, restart, etc.)
  isHardOwner(jid) {
    if (!jid || typeof jid !== 'string') return false
    const senderNum = jid.split('@')[0].split(':')[0].trim()
    if (!senderNum || !/^\d+$/.test(senderNum)) return false

    // Uniquement les owners fixes — pas de dynamicOwner, pas de LID connecté
    return config.owners.some(o => {
      const ownerNum = o.number?.split('@')[0]?.split(':')[0]?.trim()
      return ownerNum && ownerNum === senderNum
    })
  }
}