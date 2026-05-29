#!/data/data/com.termux/files/usr/bin/bash

# ═══════════════════════════════════════════════════════════════
#   ZΞRO_BΛILΞY_4 4 4 — Setup Termux
#   Version Quantisée Mobile by Regas_king x ENZO 4 4 4
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'
BRED='\033[1;31m'
BBLUE='\033[1;34m'
CYAN='\033[0;36m'
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

# ════════════════════════════════════════
#   INTRO
# ════════════════════════════════════════
clear
sleep 0.1

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

echo -e "${BBLUE}${BOLD}"
echo "              .                          "
echo "             /|\\                         "
echo "            / | \\                        "
echo -e "           /  |  \\     ${BRED}( •̀ ω •́ )✧${BBLUE}       "
echo "          /═══╪═══\\                      "
echo "              ║                          "
echo "           ╔══╩══╗                       "
echo "           ║${BRED}█████${BBLUE}║                       "
echo -e "           ║${BRED}█${RED}◉◉${BRED}█${BBLUE}║                       "
echo "           ║${BRED}█████${BBLUE}║                       "
echo "           ╚══╦══╝                       "
echo "             ╔╩╗                         "
echo "             ║ ║                         "
echo "            ╔╩═╩╗                        "
echo "            ╚═══╝                        "
echo -e "${NC}"
echo -e "  ${BRED}\"${WHITE}At noon, I am the one who surpasses all.${BRED}\"${NC}"
echo -e "  ${DIM}― Escanor, The Lion's Sin of Pride${NC}"
echo ""
sleep 1.2
echo -e "  ${YELLOW}${BOLD}Initialisation de l'installation...${NC}"
echo ""
sleep 0.5

# ════════════════════════════════════════
#   INSTALLATION
# ════════════════════════════════════════

section "Vérification"
progress_bar "Détection Termux      "
if [ ! -d "/data/data/com.termux" ]; then
  error "Ce script doit être exécuté dans Termux."
fi
log "Termux détecté"

section "Mise à jour des paquets"
progress_bar "pkg update/upgrade    "
pkg update -y > /dev/null 2>&1 && pkg upgrade -y > /dev/null 2>&1
log "Paquets à jour"

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

section "PM2"
progress_bar "npm install -g pm2   "
npm install -g pm2 > /dev/null 2>&1
log "PM2 installé"

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

section "Packages Node"
progress_bar "npm install          "
cd "$BOT_DIR" && npm install --ignore-scripts > /dev/null 2>&1
log "node_modules installé"

# ════════════════════════════════════════
#   GUIDE DES CLÉS API
# ════════════════════════════════════════
clear
echo ""
echo -e "${BBLUE}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║         GUIDE DE CONFIGURATION           ║"
echo "  ║     Où trouver tes clés API 🔑            ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "  ${YELLOW}${BOLD}Lis attentivement avant de continuer.${NC}"
echo -e "  ${DIM}Tu vas avoir besoin de ces clés pour que le bot fonctionne.${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}① UPSTASH REDIS${NC} ${DIM}(stockage des sessions — OBLIGATOIRE)${NC}"
echo -e "     🌐 ${CYAN}https://upstash.com${NC}"
echo -e "     ${DIM}→ Crée un compte gratuit${NC}"
echo -e "     ${DIM}→ New Database → copie REST URL et REST Token${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}② MISTRAL AI${NC} ${DIM}(commande .ai)${NC}"
echo -e "     🌐 ${CYAN}https://console.mistral.ai/api-keys${NC}"
echo -e "     ${DIM}→ Crée un compte → API Keys → Create new key${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}③ OPENWEATHER${NC} ${DIM}(commande .weather)${NC}"
echo -e "     🌐 ${CYAN}https://openweathermap.org/api${NC}"
echo -e "     ${DIM}→ Sign Up → API Keys → copie la clé${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}④ GENIUS${NC} ${DIM}(commande .lyrics)${NC}"
echo -e "     🌐 ${CYAN}https://genius.com/api-clients${NC}"
echo -e "     ${DIM}→ New API Client → copie Client Access Token${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}⑤ SPOTIFY${NC} ${DIM}(commande .spotify)${NC}"
echo -e "     🌐 ${CYAN}https://developer.spotify.com/dashboard${NC}"
echo -e "     ${DIM}→ Create App → copie Client ID et Client Secret${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}⑥ REMOVE.BG${NC} ${DIM}(suppression de fond)${NC}"
echo -e "     🌐 ${CYAN}https://www.remove.bg/api${NC}"
echo -e "     ${DIM}→ Get API Key gratuit${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}⑦ SCREENSHOT API${NC} ${DIM}(commande .ss)${NC}"
echo -e "     🌐 ${CYAN}https://screenshotapi.net${NC}  ${DIM}ou${NC}  ${CYAN}https://screenshotone.com${NC}"
echo -e "     ${DIM}→ Sign Up → copie API Key et Secret${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}⑧ SESSION CIPHER KEY${NC} ${DIM}(chiffrement des sessions — OBLIGATOIRE)${NC}"
echo -e "     ${DIM}→ Génère une clé aléatoire de 32 caractères${NC}"
echo -e "     ${DIM}→ Exemple :${NC} ${CYAN}$(openssl rand -hex 16)${NC}"
echo ""

echo -e "  ${BBLUE}${BOLD}⑨ API SECRET${NC} ${DIM}(authentification dashboard)${NC}"
echo -e "     ${DIM}→ Invente un mot de passe fort pour le dashboard${NC}"
echo -e "     ${DIM}→ Exemple :${NC} ${CYAN}$(openssl rand -hex 12)${NC}"
echo ""

echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${WHITE}UPSTASH REDIS et SESSION CIPHER KEY sont obligatoires.${NC}"
echo -e "  ${WHITE}Les autres sont optionnelles selon les commandes que tu utilises.${NC}"
echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -ne "  ${BGREEN}Appuie sur Entrée quand tu es prêt...${NC}"
read

# ════════════════════════════════════════
#   CONFIGURATION .env
# ════════════════════════════════════════
clear
section "Configuration du bot"

if [ -f "$BOT_DIR/.env" ]; then
  warn ".env déjà présent"
  echo -ne "  ${YELLOW}Écraser le .env existant ? (o/N) :${NC} "
  read OVERWRITE
  if [[ "$OVERWRITE" != "o" && "$OVERWRITE" != "O" ]]; then
    warn ".env conservé — passage à la suite"
  else
    rm "$BOT_DIR/.env"
  fi
fi

if [ ! -f "$BOT_DIR/.env" ]; then
  echo ""
  echo -e "  ${CYAN}Laisse vide pour passer une clé optionnelle.${NC}"
  echo ""

  read -p "  ① Ton numéro WhatsApp (ex: 50988442536) : " OWNER1_NUM
  read -p "  ② Numéro co-owner (Enzo) : " OWNER2_NUM
  echo ""
  read -p "  ③ Upstash Redis URL (https://...) : " REDIS_URL
  read -p "  ④ Upstash Redis Token : " REDIS_TOKEN
  echo ""
  read -p "  ⑤ Mistral API Key : " MISTRAL_KEY
  read -p "  ⑥ OpenWeather API Key : " WEATHER_KEY
  read -p "  ⑦ Genius API Key : " GENIUS_KEY
  read -p "  ⑧ Spotify Client ID : " SPOTIFY_ID
  read -p "  ⑨ Spotify Client Secret : " SPOTIFY_SECRET
  read -p "  ⑩ RemoveBG API Key : " REMOVEBG_KEY
  read -p "  ⑪ Screenshot API Key : " SS_KEY
  read -p "  ⑫ Screenshot Secret Key : " SS_SECRET
  echo ""
  # Génération auto des clés obligatoires si vides
  SESSION_KEY=$(openssl rand -hex 16)
  API_SECRET=$(openssl rand -hex 12)
  read -p "  ⑬ Session Cipher Key (Entrée = auto: ${SESSION_KEY}) : " SESSION_INPUT
  SESSION_CIPHER=${SESSION_INPUT:-$SESSION_KEY}
  read -p "  ⑭ API Secret dashboard (Entrée = auto: ${API_SECRET}) : " API_INPUT
  API_SECRET_FINAL=${API_INPUT:-$API_SECRET}
  echo ""
  read -p "  Préfixe du bot (défaut: .) : " PREFIX
  PREFIX=${PREFIX:-.}
  read -p "  Nom du bot (défaut: ZΞRO_BΛILΞY_4 4 4) : " BOT_NAME
  BOT_NAME=${BOT_NAME:-"ZΞRO_BΛILΞY_4 4 4"}
  read -p "  Port (défaut: 3000) : " PORT
  PORT=${PORT:-3000}

  printf '%s\n' \
    "OWNER1_NUMBER=${OWNER1_NUM}" \
    "OWNER2_NUMBER=${OWNER2_NUM}" \
    "UPSTASH_REDIS_REST_URL=${REDIS_URL}" \
    "UPSTASH_REDIS_REST_TOKEN=${REDIS_TOKEN}" \
    "MISTRAL_API_KEY=${MISTRAL_KEY}" \
    "OPENWEATHER_API_KEY=${WEATHER_KEY}" \
    "GENIUS_API_KEY=${GENIUS_KEY}" \
    "SPOTIFY_CLIENT_ID=${SPOTIFY_ID}" \
    "SPOTIFY_CLIENT_SECRET=${SPOTIFY_SECRET}" \
    "REMOVEBG_API_KEY=${REMOVEBG_KEY}" \
    "SCREENSHOT_API_KEY=${SS_KEY}" \
    "SCREENSHOT_SECRET_KEY=${SS_SECRET}" \
    "SESSION_CIPHER_KEY=${SESSION_CIPHER}" \
    "API_SECRET=${API_SECRET_FINAL}" \
    "BOT_NAME=${BOT_NAME}" \
    "PREFIX=${PREFIX}" \
    "PORT=${PORT}" \
    "NODE_ENV=production" \
    "LOG_LEVEL=error" \
    > "$BOT_DIR/.env"

  log ".env créé avec ${BOLD}19 variables${NC}"
fi

# ════════════════════════════════════════
#   ALIASSES
# ════════════════════════════════════════
section "Aliasses"
progress_bar "Configuration shell  "

SHELL_RC="$HOME/.bashrc"
touch "$SHELL_RC"

if ! grep -q "# ZERO_BOT_ALIASES" "$SHELL_RC" 2>/dev/null; then
  cat >> "$SHELL_RC" << 'ALIASES'

# ZERO_BOT_ALIASES
alias bot-start='cd ~/zero_Bailey_444 && pm2 start server.js --name zero-bot && pm2 save'
alias bot-stop='pm2 stop zero-bot'
alias bot-restart='pm2 restart zero-bot'
alias bot-logs='pm2 logs zero-bot --lines 50'
alias bot-status='pm2 status'
alias bot-update='cd ~/zero_Bailey_444 && git pull && npm install --ignore-scripts && pm2 restart zero-bot'
alias bot-kill='pm2 delete zero-bot'
alias bot-env='nano ~/zero_Bailey_444/.env'
ALIASES
fi
source "$SHELL_RC" 2>/dev/null
log "Aliasses configurés"

# ════════════════════════════════════════
#   LANCEMENT
# ════════════════════════════════════════
section "Lancement"
progress_bar "Démarrage PM2        "
cd "$BOT_DIR"
pm2 delete zero-bot > /dev/null 2>&1
pm2 start server.js --name zero-bot --max-memory-restart 300M > /dev/null 2>&1
pm2 save > /dev/null 2>&1
log "Bot lancé"

# ════════════════════════════════════════
#   FIN
# ════════════════════════════════════════
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
echo -e "  ${BGREEN}bot-env${NC}      Modifier le .env"
echo ""
echo -e "  ${YELLOW}Recharge le shell :${NC} ${WHITE}source ~/.bashrc${NC}"
echo ""
