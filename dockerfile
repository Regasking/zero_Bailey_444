FROM node:20-alpine

# Dépendances système pour canvas, sharp, ffmpeg etc.
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p sessions

EXPOSE 3000

CMD ["node", "server.js"]