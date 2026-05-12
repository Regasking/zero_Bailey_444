import { personality } from '../../utils/personality.js'

export default {
  name: 'translate',
  alias: ['trad', 'traduire'],
  desc: 'Traduire un texte',
  category: 'tools',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid

    const langMap = {
      // Langues principales
      'anglais': 'en', 'english': 'en', 'us': 'en', 'uk': 'en',
      'français': 'fr', 'french': 'fr', 'frenchman': 'fr',
      'espagnol': 'es', 'spanish': 'es', 'castillan': 'es',
      'créole': 'ht', 'creole': 'ht', 'kreyol': 'ht',
      'portugais': 'pt', 'portuguese': 'pt', 'porto': 'pt',
      'arabe': 'ar', 'arabic': 'ar', 'arab': 'ar',
      'allemand': 'de', 'german': 'de', 'deutsch': 'de',
      'italien': 'it', 'italian': 'it', 'italiano': 'it',
      'japonais': 'ja', 'japanese': 'ja', 'nihongo': 'ja',
      'chinois': 'zh', 'chinese': 'zh', 'mandarin': 'zh',
      'russe': 'ru', 'russian': 'ru',
      'coréen': 'ko', 'korean': 'ko', 'hangul': 'ko',
      'thaï': 'th', 'thai': 'th', 'thailand': 'th',
      'turc': 'tr', 'turkish': 'tr', 'turkey': 'tr', 'turquie': 'tr',
      'grec': 'el', 'greek': 'el', 'grèce': 'el',
      'néerlandais': 'nl', 'dutch': 'nl', 'netherlands': 'nl', 'flamand': 'nl',
      'suédois': 'sv', 'swedish': 'sv', 'svenska': 'sv',
      'norvégien': 'no', 'norwegian': 'no', 'norge': 'no',
      'danois': 'da', 'danish': 'da', 'danmark': 'da',
      'finnois': 'fi', 'finnish': 'fi', 'finlande': 'fi',
      'polonais': 'pl', 'polish': 'pl', 'pologne': 'pl',
      'tchèque': 'cs', 'czech': 'cs', 'bohemian': 'cs',
      'slovaque': 'sk', 'slovak': 'sk', 'slovakia': 'sk',
      'hongrois': 'hu', 'hungarian': 'hu', 'magyar': 'hu',
      'roumain': 'ro', 'romanian': 'ro', 'romania': 'ro',
      'bulgare': 'bg', 'bulgarian': 'bg', 'bulgarie': 'bg',
      'serbe': 'sr', 'serbian': 'sr', 'serbia': 'sr',
      'croate': 'hr', 'croatian': 'hr', 'croatie': 'hr',
      'slovène': 'sl', 'slovenian': 'sl', 'slovenia': 'sl',
      'lituanien': 'lt', 'lithuanian': 'lt', 'lituanie': 'lt',
      'letton': 'lv', 'latvian': 'lv', 'latvia': 'lv',
      'estonien': 'et', 'estonian': 'et', 'estonia': 'et',
      'hébreux': 'he', 'hebrew': 'he', 'israël': 'he', 'israel': 'he',
      'farsi': 'fa', 'persan': 'fa', 'persian': 'fa', 'iran': 'fa',
      'ourdou': 'ur', 'urdu': 'ur', 'pakistan': 'ur',
      'hindi': 'hi', 'hindou': 'hi', 'inde': 'hi', 'india': 'hi',
      'bengali': 'bn', 'bangla': 'bn', 'bangladesh': 'bn',
      'tamoul': 'ta', 'tamil': 'ta', 'tamilnadu': 'ta',
      'télougou': 'te', 'telugu': 'te', 'andhra': 'te',
      'marathi': 'mr', 'maharastra': 'mr',
      'gujarati': 'gu', 'gujarat': 'gu',
      'kannada': 'kn', 'kanada': 'kn', 'karnataka': 'kn',
      'malayalam': 'ml', 'kerala': 'ml',
      'punjabi': 'pa', 'panjabi': 'pa', 'punjab': 'pa',
      'indonésien': 'id', 'indonesian': 'id', 'indonésie': 'id',
      'malais': 'ms', 'malay': 'ms', 'malaysia': 'ms', 'malaisie': 'ms',
      'tagalog': 'tl', 'pilipino': 'tl', 'philippines': 'tl', 'philippin': 'tl',
      'vietnamien': 'vi', 'vietnamese': 'vi', 'vietnam': 'vi',
      'birman': 'my', 'burmese': 'my', 'myanmar': 'my', 'birmanie': 'my',
      'khmer': 'km', 'cambodien': 'km', 'cambodge': 'km', 'cambodia': 'km',
      'laotien': 'lo', 'lao': 'lo', 'laos': 'lo',
      'singhalais': 'si', 'sinhala': 'si', 'srilanka': 'si', 'ceylan': 'si',
      'népalais': 'ne', 'nepali': 'ne', 'nepal': 'ne', 'népal': 'ne',
      'géorgien': 'ka', 'georgian': 'ka', 'georgia': 'ka', 'géorgie': 'ka',
      'arménien': 'hy', 'armenian': 'hy', 'arménie': 'hy', 'armenia': 'hy',
      'azerbaïdjanais': 'az', 'azeri': 'az', 'azerbaijan': 'az',
      'kazakh': 'kk', 'kazakhstan': 'kk',
      'ouzbek': 'uz', 'uzbek': 'uz', 'ouzbékistan': 'uz', 'uzbekistan': 'uz',
      'turkmène': 'tk', 'turkmen': 'tk', 'turkménistan': 'tk',
      'tadjik': 'tg', 'tajik': 'tg', 'tadjikistan': 'tg',
      'kirghiz': 'ky', 'kyrgyz': 'ky', 'kirghizstan': 'ky', 'kyrgyzstan': 'ky',
      'mongol': 'mn', 'mongolian': 'mn', 'mongolie': 'mn', 'mongolia': 'mn',
      'afrikaans': 'af', 'afrique': 'af',
      'swahili': 'sw', 'tanzanie': 'sw', 'tanzania': 'sw', 'kenya': 'sw',
      'yoruba': 'yo', 'nigéria': 'yo', 'nigeria': 'yo',
      'igbo': 'ig', 'nigérians': 'ig',
      'haoussa': 'ha', 'niger': 'ha', 'hausa': 'ha',
      'somali': 'so', 'somalie': 'so', 'somalia': 'so',
      'amharique': 'am', 'éthiopien': 'am', 'éthiopie': 'am', 'ethiopia': 'am',
      'tigrinya': 'ti', 'érythrée': 'ti', 'eritrea': 'ti',
      'malgache': 'mg', 'madagascar': 'mg',
      'maori': 'mi', 'nouvelle-zélande': 'mi', 'newzealand': 'mi',
      'tongan': 'to', 'tonga': 'to',
      'samoan': 'sm', 'samoa': 'sm',
      'fidjien': 'fj', 'fiji': 'fj', 'fidji': 'fj',
      'quechua': 'qu', 'pérou': 'qu', 'peru': 'qu',
      'aymara': 'ay', 'bolivie': 'ay', 'bolivia': 'ay',
      'guarani': 'gn', 'paraguay': 'gn',
      'nahuatl': 'nah', 'mexique': 'nah', 'mexico': 'nah',
      'maya': 'yua', 'mayans': 'yua',
      'irlandais': 'ga', 'irish': 'ga', 'irlande': 'ga', 'ireland': 'ga',
      'écossais': 'gd', 'scots': 'gd', 'gaelic': 'gd', 'écosse': 'gd',
      'gallois': 'cy', 'welsh': 'cy', 'pays-de-galles': 'cy',
      'breton': 'br', 'bretagne': 'br', 'brittonic': 'br',
      'basque': 'eu', 'basques': 'eu', 'euskera': 'eu',
      'catalan': 'ca', 'catalogne': 'ca', 'catalonia': 'ca',
      'maltais': 'mt', 'malte': 'mt', 'malta': 'mt',
      'albanais': 'sq', 'albanian': 'sq', 'albanie': 'sq', 'albania': 'sq',
      'macédonien': 'mk', 'macedonian': 'mk', 'macédoine': 'mk', 'macedonia': 'mk',
      'islandais': 'is', 'icelandic': 'is', 'islande': 'is', 'iceland': 'is',
      'luxembourgeois': 'lb', 'luxemburgish': 'lb', 'luxembourg': 'lb',
      'corse': 'co', 'corsican': 'co',
      'provençal': 'oc', 'occitan': 'oc', 'provence': 'oc',
      'wallon': 'wa', 'walloon': 'wa', 'wallonie': 'wa',
      'frison': 'fy', 'frisian': 'fy', 'frise': 'fy',
      'sorabe': 'dsb', 'sorbian': 'dsb',
      'esperanto': 'eo', 'espéranto': 'eo',
      'volapük': 'vo', 'volapuk': 'vo',
      'interlingua': 'ia', 'interlingual': 'ia',
      'latin': 'la', 'latinais': 'la',
      'sanskrit': 'sa', 'sanscrit': 'sa', 'devanagari': 'sa',
      'pali': 'pi', 'pāli': 'pi',
      'avestique': 'ae', 'avestan': 'ae',
      'rhéto-roman': 'roh', 'romansch': 'roh', 'romanche': 'roh',
      'frioul': 'fur', 'friulian': 'fur', 'friuli': 'fur',
      'ladin': 'lld', 'ladino': 'lld',
      'piémontais': 'pms', 'piedmontese': 'pms', 'piémont': 'pms',
      'sicilien': 'scn', 'sicilian': 'scn', 'sicile': 'scn',
      'napolitain': 'nap', 'neapolitan': 'nap',
      'calabrais': 'cal', 'calabrese': 'cal',
      'vénitien': 'vec', 'venetian': 'vec', 'venise': 'vec',
      'lombard': 'lmo', 'lombardy': 'lmo', 'lombardie': 'lmo',
      'arpitan': 'frp', 'francoprovençal': 'frp', 'francoprovencal': 'frp',
      'galicien': 'gl', 'galician': 'gl', 'galice': 'gl', 'galicia': 'gl',
      'asturien': 'ast', 'asturian': 'ast', 'principalité-des-asturies': 'ast',
      'léonais': 'leo', 'leonese': 'leo',
      'mirandais': 'mwl', 'mirandese': 'mwl',
      'comtois': 'co', 'comté': 'co',
      'normand': 'nrf', 'norman': 'nrf', 'normandie': 'nrf',
      'picard': 'pcd', 'picardian': 'pcd', 'picardie': 'pcd',
      'champenois': 'chm', 'champagne': 'chm',
      'bourguignon': 'burg', 'burgundian': 'burg', 'bourgogne': 'burg',
      'limousin': 'lim', 'limousine': 'lim',
      'gascogne': 'gas', 'gascon': 'gas', 'gascony': 'gas',
      'languedocien': 'lfv', 'languedocian': 'lfv', 'languedoc': 'lfv',
      'auvergnat': 'au', 'auvergne': 'au',
      'dauphinois': 'dau', 'dauphiné': 'dau',
      'savoyie': 'sav', 'savoyard': 'sav', 'savoie': 'sav',
      'jura': 'jur', 'jurassien': 'jur', 'jurassic': 'jur',
      'émilien': 'egl', 'emilian': 'egl', 'émilie': 'egl',
      'romagnol': 'rgn', 'romagne': 'rgn',
      'bolognais': 'bm', 'bolognese': 'bm', 'bologna': 'bm',
      'modenais': 'mod', 'modenese': 'mod', 'modène': 'mod',
      'régien': 'rgn', 'reggian': 'rgn', 'reggio': 'rgn',
      'parmigian': 'prm', 'parmesan': 'prm', 'parme': 'prm',
      'tortonais': 'tort', 'tortonese': 'tort', 'tortona': 'tort',
      'vercellais': 'verc', 'vercellese': 'verc', 'vercelli': 'verc',
      'novarais': 'nov', 'novarese': 'nov', 'novara': 'nov',
      'ticino': 'tici', 'ticinese': 'tici', 'tessin': 'tici',
    }
    if (args.length < 2) {
      return sock.sendMessage(jid, {
        text: personality.format('error_usage') + '\n\nUtilisation : .translate <langue> <texte>\nEx: .translate en Bonjour tout le monde'
      })
    }

    const lang = langMap[args[0].toLowerCase()] || args[0]
    const text = args.slice(1).join(' ')

    try {
      await sock.sendMessage(jid, { text: personality.format('loading') })

      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
      )
      const data = await res.json()
      const translated = data[0].map(item => item[0]).join('')

      await sock.sendMessage(jid, {
        text: `🌐 *Traduction → ${lang}*\n━━━━━━━━━━━━━━━━━━━━━\n${translated}\n━━━━━━━━━━━━━━━━━━━━━\n— ${personality.format('success')}`
      })

    } catch (err) {
      console.error('[TRANSLATE ERROR]', err)
      await sock.sendMessage(jid, { text: personality.format('error_technical') })
    }
  }
}