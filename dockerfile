FROM node:20-alpine

# Dépendances système pour canvas, sharp, ffmpeg etc.
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev

# Installation de yt-dlp
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p sessions temp

EXPOSE 3000

CMD ["node", "server.js"]