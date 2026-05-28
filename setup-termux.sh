#!/data/data/com.termux/files/usr/bin/bash

# ═══════════════════════════════════════════════════════════════
#   ZΞRO_BΛILΞY_4 4 4 — Setup Termux
#   Version Quantisée Mobile by Regas_king x ENZO 4 4 4
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'
BRED='\033[1;31m'
BLUE='\033[0;34m'
BBLUE='\033[1;34m'
CYAN='\033[0;36m'
BCYAN='\033[1;36m'
YELLOW='\033[1;33m'
WHITE='\033[1;37m'
DIM='\033[2m'
GREEN='\033[0;32m'
BGREEN='\033[1;32m'
NC='\033[0m'
BOLD='\033[1m'

REPO_URL="https://github.com/Regasking/zero_Bailey_444"
BOT_DIR="$HOME/zero_Bailey_444"

log()     { echo -e "${BGREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${BRED}[✗] ERREUR : $1${NC}"; exit 1; }
section() { echo -e "\n${BBLUE}${BOLD}  ━━━ $1 ━━━${NC}"; sleep 0.2; }

# ── Barre de progression ───────────────────────────────────────
progress_bar() {
  local label="$1"
  local total=25
  echo -ne "  ${WHITE}${label}${NC} ${DIM}[${NC}"
  for ((i=0; i<total; i++)); do
    echo -ne "${BBLUE}█${NC}"
    sleep 0.03
  done
  echo -e "${DIM}]${NC} ${BGREEN}✓${NC}"
}

# ── INTRO ──────────────────────────────────────────────────────
clear
sleep 0.1

# ── Logo ZΞRO au centre ────────────────────────────────────────
echo ""
echo -e "${BBLUE}${BOLD}"
echo "       ███████╗███████╗██████╗  ██████╗ "
echo "          ╚══███╔╝██╔════╝██╔══██╗██╔═══██╗"
echo "            ███╔╝ █████╗  ██████╔╝██║   ██║"
echo "           ███╔╝  ██╔══╝  ██╔══██╗██║   ██║"
echo "          ███████╗███████╗██║  ██║╚██████╔╝"
echo "          ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ "
echo -e "${NC}"
echo -e "${CYAN}${BOLD}           B Λ I L Ξ Y   4   4   4${NC}"
echo -e "${DIM}          Version Quantisée Termux v1.0${NC}"
echo -e "${DIM}          by Regas_king dth x ENZO 4 4 4${NC}"
echo ""
sleep 0.8

# ── Escanor avec hache ─────────────────────────────────────────
echo -e "${BBLUE}${BOLD}"
echo "              .                          "
echo "             /|\\                         "
echo "            / | \\                        "
echo -e "           /  |  \\     ${BRED}( •̀ ω •́ )✧${BBLUE}       "
echo "          /═══╪═══\\   /             "
echo "              ║        /|            "
echo "           ╔══╩══╗    / |            "
echo "           ║${BRED}█████${BBLUE}║   /  |            "
echo -e "           ║${BRED}█${RED}◉◉${BRED}█${BBLUE}║--'   |            "
echo "           ║${BRED}█████${BBLUE}║      |            "
echo "           ╚══╦══╝      |            "
echo "             ╔╩╗        |            "
echo "             ║ ║        |            "
echo "             ║ ║    ════╪════        "
echo "            ╔╩═╩╗      |            "
echo "            ╚═══╝      |            "
echo -e "${NC}"
echo -e "  ${BRED}\"${WHITE}At noon, I am the one who surpasses all.${BRED}\"${NC}"
echo -e "  ${DIM}― Escanor, The Lion's Sin of Pride${NC}"
echo ""
sleep 1.2

# ── Transition vers l'installation ────────────────────────────
echo -e "  ${YELLOW}${BOLD}Initialisation de l'installation...${NC}"
echo ""
sleep 0.5

# ════════════════════════════════════════
#   INSTALLATION
# ════════════════════════════════════════

# ── 1. Vérification Termux ─────────────────────────────────────
section "Vérification"
progress_bar "Détection Termux      "
if [ ! -d "/data/data/com.termux" ]; then
  error "Ce script doit être exécuté dans Termux."
fi
log "Termux détecté"

# ── 2. Mise à jour ─────────────────────────────────────────────
section "Mise à jour des paquets"
progress_bar "pkg update/upgrade    "
pkg update -y > /dev/null 2>&1 && pkg upgrade -y > /dev/null 2>&1
log "Paquets à jour"

# ── 3. Dépendances ────────────────────────────────────────────
section "Installation des dépendances"

declare -a PACKAGES=("nodejs-lts" "git" "python" "ffmpeg" "aria2" "curl" "wget" "openssl" "make" "clang")
declare -a LABELS=(
  "Node.js LTS          "
  "Git                  "
  "Python               "
  "FFmpeg               "
  "Aria2                "
  "Curl                 "
  "Wget                 "
  "OpenSSL              "
  "Make                 "
  "Clang                "
)

for i in "${!PACKAGES[@]}"; do
  progress_bar "${LABELS[$i]}"
  pkg install -y "${PACKAGES[$i]}" > /dev/null 2>&1
done

progress_bar "yt-dlp               "
pip install -q yt-dlp > /dev/null 2>&1
log "Dépendances installées"

# ── 4. PM2 ────────────────────────────────────────────────────
section "PM2"
progress_bar "npm install -g pm2   "
npm install -g pm2 > /dev/null 2>&1
log "PM2 installé"

# ── 5. Clonage ────────────────────────────────────────────────
section "Clonage du repo"
progress_bar "git clone            "
if [ -d "$BOT_DIR" ]; then
  warn "Dossier existant — mise à jour"
  cd "$BOT_DIR" && git pull > /dev/null 2>&1
else
  git clone "$REPO_URL" "$BOT_DIR" > /dev/null 2>&1
  [ $? -ne 0 ] && error "Impossible de cloner le repo. Vérifie qu'il est public."
fi
log "Repo cloné → $BOT_DIR"

# ── 6. npm install ────────────────────────────────────────────
section "Packages Node"
progress_bar "npm install          "
cd "$BOT_DIR" && npm install --omit=dev > /dev/null 2>&1
log "node_modules installé"

# ── 7. .env ───────────────────────────────────────────────────
section "Configuration"

if [ -f "$BOT_DIR/.env" ]; then
  warn ".env déjà présent — conservé"
else
  echo ""
  echo -e "  ${YELLOW}Configure ton bot :${NC}"
  echo ""
  read -p "  Ton numéro WhatsApp (ex: 50988442536) : " OWNER1_NUM
  read -p "  Numéro co-owner (Enzo) : " OWNER2_NUM
  read -p "  Upstash Redis URL : " REDIS_URL
  read -p "  Upstash Redis Token : " REDIS_TOKEN
  read -p "  Préfixe (défaut: .) : " PREFIX
  PREFIX=${PREFIX:-.}
  read -p "  Nom du bot (défaut: ZΞRO_BΛILΞY_4 4 4) : " BOT_NAME
  BOT_NAME=${BOT_NAME:-"ZΞRO_BΛILΞY_4 4 4"}
  read -p "  Port (défaut: 3000) : " PORT
  PORT=${PORT:-3000}

  cat > "$BOT_DIR/.env" << ENV
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

# ── 8. Aliasses ───────────────────────────────────────────────
section "Aliasses"
progress_bar "Configuration shell  "
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
fi
log "Aliasses configurés"

# ── 9. Lancement ──────────────────────────────────────────────
section "Lancement"
progress_bar "Démarrage PM2        "
cd "$BOT_DIR"
pm2 delete zero-bot 2>/dev/null
pm2 start server.js --name zero-bot --max-memory-restart 300M > /dev/null 2>&1
pm2 save > /dev/null 2>&1
log "Bot lancé"

# ── FIN ───────────────────────────────────────────────────────
echo ""
echo -e "${BBLUE}${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║       INSTALLATION TERMINÉE ⚡       ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  📱 Dashboard : ${CYAN}http://localhost:${PORT:-3000}${NC}"
echo ""
echo -e "  ${BOLD}Commandes :${NC}"
echo -e "  ${BGREEN}bot-start${NC}    Démarrer"
echo -e "  ${BGREEN}bot-stop${NC}     Arrêter"
echo -e "  ${BGREEN}bot-restart${NC}  Redémarrer"
echo -e "  ${BGREEN}bot-logs${NC}     Logs en direct"
echo -e "  ${BGREEN}bot-update${NC}   Mettre à jour"
echo ""
echo -e "  ${YELLOW}Tape ${WHITE}bot-logs${YELLOW} pour voir les logs en direct.${NC}"
echo ""