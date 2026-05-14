import dotenv from 'dotenv'
dotenv.config()

export const config = {
  botName: 'ZΞRO_BΛILΞY_4 4 4',
  prefix: '.',
  channelLink: 'https://whatsapp.com/channel/0029Vb7XnIMElagkvLe8ga0b',
  channelName: 'Dev & Hacking Éthique',

  owners: [
    {
      number: process.env.OWNER1_NUMBER + '@s.whatsapp.net',
      lid: process.env.OWNER1_LID + '@lid',
      name: '𝕽𝖊𝖌𝖆𝖘_𝖐𝖎𝖓𝖌 𝖉𝖙𝖍',
      role: 'owner'
    },
    {
      number: process.env.OWNER2_NUMBER + '@s.whatsapp.net',
      lid: process.env.OWNER2_LID + '@lid',
      name: '𝑨ꝛ፝֟「𝐄 𝐍 𝐙 𝐎•⁴ ⁴ ⁴」•𓆪𓃵',
      role: 'co-owner'
    }
  ],

  // Rempli automatiquement au démarrage par server.js
  // Ne pas modifier manuellement
  dynamicOwner: null,
  connectedLid: null,

  apis: {
    mistral: process.env.MISTRAL_API_KEY,
    weather: process.env.OPENWEATHER_API_KEY,
    genius: process.env.GENIUS_API_KEY,
    spotifyId: process.env.SPOTIFY_CLIENT_ID,
    spotifySecret: process.env.SPOTIFY_CLIENT_SECRET,
    removebg: process.env.REMOVEBG_API_KEY,
    screenshot: process.env.SCREENSHOT_API_KEY,
    screenshotSecret: process.env.SCREENSHOT_SECRET_KEY,
  },

  settings: {
    autoRead: true,
    autoTyping: true,
    antiCall: true,
    publicMode: true,
    cooldown: 3,
  }
}