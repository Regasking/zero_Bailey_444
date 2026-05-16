// ═══════════════════════════════════════════════
// i18n.js — Système de traduction simple
// Langue par défaut : français
// ═══════════════════════════════════════════════

const translations = {
  fr: {
    maintenance:    '🔧 Bot en maintenance. Reviens plus tard.',
    unknown_cmd:    '❓ Commande inconnue. Tape .menu si tu es perdu.',
    no_permission:  '🚫 Tu n\'as pas la permission d\'utiliser cette commande.',
    group_only:     '👥 Cette commande fonctionne uniquement en groupe.',
    cooldown:       '⏳ Attends un peu avant de réutiliser une commande.',
    error_usage:    '❌ Utilisation incorrecte.',
    error_technical:'⚠️ Erreur technique. Réessaie.',
  },
  en: {
    maintenance:    '🔧 Bot under maintenance. Come back later.',
    unknown_cmd:    '❓ Unknown command. Type .menu if you\'re lost.',
    no_permission:  '🚫 You don\'t have permission to use this command.',
    group_only:     '👥 This command only works in groups.',
    cooldown:       '⏳ Wait a bit before using a command again.',
    error_usage:    '❌ Incorrect usage.',
    error_technical:'⚠️ Technical error. Please retry.',
  },
  es: {
    maintenance:    '🔧 Bot en mantenimiento. Vuelve más tarde.',
    unknown_cmd:    '❓ Comando desconocido. Escribe .menu si estás perdido.',
    no_permission:  '🚫 No tienes permiso para usar este comando.',
    group_only:     '👥 Este comando solo funciona en grupos.',
    cooldown:       '⏳ Espera un poco antes de usar otro comando.',
    error_usage:    '❌ Uso incorrecto.',
    error_technical:'⚠️ Error técnico. Inténtalo de nuevo.',
  },
  pt: {
    maintenance:    '🔧 Bot em manutenção. Volte mais tarde.',
    unknown_cmd:    '❓ Comando desconhecido. Digite .menu se estiver perdido.',
    no_permission:  '🚫 Você não tem permissão para usar este comando.',
    group_only:     '👥 Este comando só funciona em grupos.',
    cooldown:       '⏳ Aguarde um pouco antes de usar outro comando.',
    error_usage:    '❌ Uso incorreto.',
    error_technical:'⚠️ Erro técnico. Tente novamente.',
  },
  ht: {
    maintenance:    '🔧 Bot ap fè antretyen. Tounen pita.',
    unknown_cmd:    '❓ Kòmand enkoni. Tape .menu si ou pèdi.',
    no_permission:  '🚫 Ou pa gen pèmisyon pou itilize kòmand sa a.',
    group_only:     '👥 Kòmand sa a travay sèlman nan gwoup.',
    cooldown:       '⏳ Tann yon ti moman anvan ou itilize yon kòmand ankò.',
    error_usage:    '❌ Itilizasyon enkòrèk.',
    error_technical:'⚠️ Erè teknik. Eseye ankò.',
  },
}

// Langue par utilisateur (en mémoire — pas Redis, c'est volontaire)
const userLangs = new Map()

/**
 * Retourne la langue d'un utilisateur (par défaut : 'fr')
 */
export function getUserLang(jid) {
  return userLangs.get(jid) || 'fr'
}

/**
 * Définit la langue d'un utilisateur
 */
export function setUserLang(jid, lang) {
  if (translations[lang]) {
    userLangs.set(jid, lang)
  }
}

/**
 * Traduit une clé pour un utilisateur donné
 * Fallback : français, puis la clé brute si introuvable
 */
export function t(jid, key) {
  const lang = getUserLang(jid)
  return (
    translations[lang]?.[key] ||
    translations['fr']?.[key] ||
    key
  )
}

/**
 * Liste des langues disponibles
 */
export const availableLangs = Object.keys(translations)
