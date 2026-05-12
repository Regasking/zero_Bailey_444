import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

export default {
  name: 'weather',
  alias: ['meteo', 'météo'],
  desc: 'Météo d\'une ville',
  category: 'tools',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .weather <ville>'
      })
    }

    const city = args.join(' ')

    try {
      await sock.sendMessage(jid, { text: personality.format('loading') })

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${config.apis.weather}&units=metric&lang=fr`
      )
      const data = await res.json()

      if (data.cod !== 200) {
        return sock.sendMessage(jid, {
          text: `Ville introuvable. ${personality.format('error_usage')}`
        })
      }

      const { name, main, weather, wind } = data

      await sock.sendMessage(jid, {
        text: `🌍 *${name}*
━━━━━━━━━━━━━━━━━━━━━
🌡️ *Température :* ${main.temp}°C
🤔 *Ressenti :* ${main.feels_like}°C
💧 *Humidité :* ${main.humidity}%
🌬️ *Vent :* ${wind.speed} m/s
☁️ *Ciel :* ${weather[0].description}
━━━━━━━━━━━━━━━━━━━━━
— ${personality.format('success')}${personality.maybeFlexCreator()}`
      })

    } catch (err) {
      console.error('[WEATHER ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}