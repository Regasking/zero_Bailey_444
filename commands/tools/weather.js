import { personality } from '../../utils/personality.js'
import { config } from '../../config.js'

const weatherComments = {
  hot: ['Chaud. Comme mes réponses.', 'Il fait chaud. Reste hydraté. Ou pas.', 'Chaleur intense. Pareil pour mon niveau.'],
  cold: ['Il fait froid. Mets un manteau. Ou souffre.', 'Froid. Comme l\'accueil que certains méritent.', 'Froid dehors. Moi je suis toujours à la bonne température.'],
  rain: ['Il pleut. Reste chez toi.', 'Pluie. L\'univers pleure. Probablement pas pour toi.', 'Il pleut. Prends un parapluie ou non. C\'est ton problème.'],
  clear: ['Ciel dégagé. Profite avant que ça change.', 'Beau temps. Va dehors pour une fois.', 'Soleil. Rare. Comme une bonne décision.'],
  cloudy: ['Nuageux. Comme les perspectives de certains.', 'Couvert. Ça peut aller.', 'Des nuages. Fascinant.'],
}

function getComment(temp, description) {
  const d = description.toLowerCase()
  if (d.includes('pluie') || d.includes('rain')) return weatherComments.rain[Math.floor(Math.random() * 3)]
  if (d.includes('nuage') || d.includes('couvert')) return weatherComments.cloudy[Math.floor(Math.random() * 3)]
  if (d.includes('dégagé') || d.includes('soleil') || d.includes('clear')) return weatherComments.clear[Math.floor(Math.random() * 3)]
  if (temp >= 30) return weatherComments.hot[Math.floor(Math.random() * 3)]
  if (temp <= 10) return weatherComments.cold[Math.floor(Math.random() * 3)]
  return 'Conditions normales. Comme toi.'
}

export default {
  name: 'weather',
  alias: ['meteo', 'météo'],
  desc: 'Météo d\'une ville',
  category: 'tools',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    if (!args.length) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + `\n\nUtilisation : ${config.prefix}weather <ville>`
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
          text: `❌ Ville introuvable : *${city}*.\n\nVérifie l'orthographe.`
        })
      }

      const { name, main, weather, wind, sys } = data
      const temp = Math.round(main.temp)
      const feels = Math.round(main.feels_like)
      const desc = weather[0].description
      const comment = getComment(temp, desc)

      const tempBar = temp >= 35 ? '🔴' : temp >= 25 ? '🟠' : temp >= 15 ? '🟡' : temp >= 5 ? '🔵' : '❄️'

      await sock.sendMessage(jid, {
        text: `╔══════════════════════╗\n  🌍  M É T É O\n╚══════════════════════╝\n\n📍 *${name}, ${sys.country}*\n\n${tempBar} *Température :* ${temp}°C\n🤔 *Ressenti :* ${feels}°C\n☁️ *Ciel :* ${desc}\n💧 *Humidité :* ${main.humidity}%\n🌬️ *Vent :* ${wind.speed} m/s\n\n_"${comment}"_\n\n— *${config.botName}*`
      })

    } catch (err) {
      console.error('[WEATHER ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}