#!/data/data/com.termux/files/usr/bin/bash

# ═══════════════════════════════════════════════════════════════
#   ZΞRO_BΛILΞY_4 4 4 — Setup Termux
#   Version quantisée mobile by Regas_king x ENZO 4 4 4
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

REPO_URL="https://github.com/Regasking/zero_Bailey_444"
BOT_DIR="$HOME/zero_Bailey_444"
NODE_VERSION="22"

banner() {
  clear
  echo -e "${CYAN}${BOLD}"
  echo "  ╔══════════════════════════════════════╗"
  echo "  ║   ZΞRO_BΛILΞY_4 4 4 — TERMUX SETUP  ║"
  echo "  ║      Version Quantisée Mobile        ║"
  echo "  ║     Regas_king dth x ENZO 4 4 4      ║"
  echo "  ╚══════════════════════════════════════╝"
  echo -e "${NC}"
}

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }

# ── 1. Vérification Termux ─────────────────────────────────────
banner
section "Vérification de l'environnement"

if [ ! -d "/data/data/com.termux" ]; then
  error "Ce script doit être exécuté dans Termux."
fi
log "Termux détecté"

# ── 2. Mise à jour des paquets ─────────────────────────────────
section "Mise à jour des paquets"
pkg update -y && pkg upgrade -y
log "Paquets mis à jour"

# ── 3. Installation des dépendances système ────────────────────
section "Installation des dépendances"

PACKAGES=(
  "nodejs-lts"
  "git"
  "python"
  "ffmpeg"
  "aria2"
  "curl"
  "wget"
  "openssl"
  "pkg-config"
  "make"
  "clang"
)

for pkg_name in "${PACKAGES[@]}"; do
  echo -ne "  Installation de ${pkg_name}... "
  pkg install -y "$pkg_name" > /dev/null 2>&1
  echo -e "${GREEN}✓${NC}"
done

# yt-dlp via pip
echo -ne "  Installation de yt-dlp... "
pip install -q yt-dlp > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"

log "Dépendances installées"

# ── 4. Vérification Node.js ────────────────────────────────────
section "Vérification Node.js"
NODE_V=$(node --version 2>/dev/null)
if [ -z "$NODE_V" ]; then
  error "Node.js non installé. Relance le script."
fi
log "Node.js $NODE_V détecté"

# PM2
echo -ne "  Installation de PM2... "
npm install -g pm2 > /dev/null 2>&1
echo -e "${GREEN}✓${NC}"
log "PM2 installé"

# ── 5. Clonage du repo ─────────────────────────────────────────
section "Clonage du repo"

if [ -d "$BOT_DIR" ]; then
  warn "Dossier existant détecté — mise à jour"
  cd "$BOT_DIR" && git pull
else
  git clone "$REPO_URL" "$BOT_DIR"
  if [ $? -ne 0 ]; then
    error "Impossible de cloner le repo. Vérifie l'URL dans le script."
  fi
fi
log "Repo cloné → $BOT_DIR"

# ── 6. Installation des packages Node ─────────────────────────
section "Installation des packages Node"
cd "$BOT_DIR"
npm install --omit=dev > /dev/null 2>&1
log "node_modules installé"

# ── 7. Configuration .env ──────────────────────────────────────
section "Configuration du bot"

if [ -f "$BOT_DIR/.env" ]; then
  warn ".env déjà présent — on le garde"
else
  echo ""
  echo -e "${YELLOW}Configure ton bot (appuie sur Entrée pour passer) :${NC}"
  echo ""

  read -p "  Ton numéro WhatsApp (ex: 50988442536) : " OWNER1_NUM
  read -p "  Numéro WhatsApp Enzo (co-owner) : " OWNER2_NUM
  read -p "  Upstash Redis URL : " REDIS_URL
  read -p "  Upstash Redis Token : " REDIS_TOKEN
  read -p "  Préfixe du bot (défaut: .) : " PREFIX
  PREFIX=${PREFIX:-.}
  read -p "  Nom du bot (défaut: ZΞRO) : " BOT_NAME
  BOT_NAME=${BOT_NAME:-"ZΞRO_BΛILΞY_4 4 4"}
  read -p "  Port (défaut: 3000) : " PORT
  PORT=${PORT:-3000}

  cat > "$BOT_DIR/.env" << ENV
# ═══ ZΞRO_BΛILΞY_4 4 4 — Config Termux ═══
OWNER1_NUMBER=${OWNER1_NUM}
OWNER2_NUMBER=${OWNER2_NUM}

UPSTASH_REDIS_REST_URL=${REDIS_URL}
UPSTASH_REDIS_REST_TOKEN=${REDIS_TOKEN}

BOT_NAME=${BOT_NAME}
PREFIX=${PREFIX}
PORT=${PORT}

NODE_ENV=production
ENV

  log ".env créé"
fi

# ── 8. Aliasses utiles ─────────────────────────────────────────
section "Configuration des aliasses"

SHELL_RC="$HOME/.bashrc"
[ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"

if ! grep -q "# ZERO_BOT_ALIASES" "$SHELL_RC" 2>/dev/null; then
  cat >> "$SHELL_RC" << 'ALIASES'

# ZERO_BOT_ALIASES
alias bot-start='cd ~/zero_Bailey_444 && pm2 start server.js --name zero-bot && pm2 save'
alias bot-stop='pm2 stop zero-bot'
alias bot-restart='pm2 restart zero-bot'
alias bot-logs='pm2 logs zero-bot --lines 50'
alias bot-status='pm2 status'
alias bot-update='cd ~/zero_Bailey_444 && git pull && npm install --omit=dev && pm2 restart zero-bot'
alias bot-kill='pm2 delete zero-bot'
ALIASES
  source "$SHELL_RC" 2>/dev/null
  log "Aliasses ajoutés"
else
  warn "Aliasses déjà présents"
fi

# ── 9. PM2 startup ────────────────────────────────────────────
section "Configuration PM2"
pm2 startup 2>/dev/null
log "PM2 configuré"

# ── 10. Lancement du bot ──────────────────────────────────────
section "Lancement du bot"
cd "$BOT_DIR"
pm2 delete zero-bot 2>/dev/null
pm2 start server.js --name zero-bot --max-memory-restart 300M
pm2 save
log "Bot lancé avec PM2"

# ── Résumé final ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║         INSTALLATION TERMINÉE ✅     ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  📱 Dashboard : ${CYAN}http://localhost:${PORT:-3000}${NC}"
echo ""
echo -e "  ${BOLD}Commandes disponibles :${NC}"
echo -e "  ${GREEN}bot-start${NC}    — Démarrer le bot"
echo -e "  ${GREEN}bot-stop${NC}     — Arrêter le bot"
echo -e "  ${GREEN}bot-restart${NC}  — Redémarrer"
echo -e "  ${GREEN}bot-logs${NC}     — Voir les logs"
echo -e "  ${GREEN}bot-status${NC}   — Statut PM2"
echo -e "  ${GREEN}bot-update${NC}   — Mettre à jour depuis GitHub"
echo ""
echo -e "  ${YELLOW}Tape 'bot-logs' pour voir les logs en direct.${NC}"
echo ""
