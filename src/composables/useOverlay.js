/*
  Affiche le logo de la compagnie aérienne dans le bandeau du haut.
  Piloté automatiquement par l'API SimBrief à partir du dernier plan de vol.
  Paramètre URL : ?simbrief=USERNAME (ou Pilot ID numérique)
  Paramètre manuel : ?cie=AFR  ou  #AFR  (désactive SimBrief pour la session)
*/

import { ref, onMounted } from 'vue'

const DOSSIER_LOGOS = 'logos/'

const COMPAGNIES = {
  AFR: { nom: 'Air France',        logo: 'air-france.svg' },
  TVF: { nom: 'Transavia',         logo: 'transavia.svg' },
  EZY: { nom: 'easyJet',           logo: 'easyjet.svg' },
  RYR: { nom: 'Ryanair',           logo: 'ryanair.svg' },
  VLG: { nom: 'Vueling',           logo: 'vueling.svg' },
  KLM: { nom: 'KLM',               logo: 'klm.svg' },
  DLH: { nom: 'Lufthansa',         logo: 'lufthansa.svg' },
  BAW: { nom: 'British Airways',   logo: 'british-airways.svg' },
  IBE: { nom: 'Iberia',            logo: 'iberia.svg' },
  WZZ: { nom: 'Wizz Air',          logo: 'wizz-air.svg' },
  VOE: { nom: 'Volotea',           logo: 'volotea.svg' },
  CRL: { nom: 'Corsair',           logo: 'corsair.png' },
  FWI: { nom: 'Air Caraibes',      logo: 'air-caraibes.svg' },
  TAP: { nom: 'TAP Air Portugal',  logo: 'tap-air-portugal.svg' },
  SWR: { nom: 'SWISS',             logo: 'swiss.svg' },
  AUA: { nom: 'Austrian Airlines', logo: 'austrian.svg' },
  DAT: { nom: 'Brussels Airlines', logo: 'brussels-airlines.svg' },
  NAX: { nom: 'Norwegian',         logo: 'norwegian.svg' },
  FIN: { nom: 'Finnair',           logo: 'finnair.svg' },
  THY: { nom: 'Turkish Airlines',  logo: 'turkish-airlines.svg' },
  PGT: { nom: 'Pegasus Airlines',  logo: 'pegasus.svg' },
  CFG: { nom: 'Condor',            logo: 'condor.svg' },
  EWG: { nom: 'Eurowings',         logo: 'eurowings.svg' },
  EIN: { nom: 'Aer Lingus',        logo: 'aer-lingus.svg' },
  AMC: { nom: 'Air Malta',         logo: 'air-malta.svg' },
  LGL: { nom: 'Luxair',            logo: 'luxair.svg' },
  CTN: { nom: 'Croatia Airlines',  logo: 'croatia-airlines.svg' },
  ASL: { nom: 'Air Serbia',        logo: 'air-serbia.svg' },
  AEE: { nom: 'Aegean Airlines',   logo: 'aegean.svg' },
  TJT: { nom: 'Twin Jet',          logo: 'twin-jet.svg' },
  DAH: { nom: 'Air Algerie',       logo: 'air-algerie.svg' },
}

/* Nom du paramètre d'URL pour forcer une compagnie manuellement : ?cie=AFR */
const PARAMETRE = 'cie'

/* Intervalle de polling SimBrief (ms) */
const SIMBRIEF_INTERVALLE_MS = 30000

const CURRENT_BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 0

export function useOverlay() {
  const logoSrc = ref('')
  const logoAlt = ref('')

  function afficher(code) {
    const cle = String(code || '').trim().toUpperCase()
    const compagnie = COMPAGNIES[cle]
    if (!compagnie || !compagnie.logo) return
    logoAlt.value = compagnie.nom
    logoSrc.value = DOSSIER_LOGOS + compagnie.logo
  }

  /* Priorité : ?simbrief= dans l'URL > variable de build VITE_SIMBRIEF_USERNAME */
  function parametreSimBrief() {
    const m = /[?&]simbrief=([^&#]+)/.exec(window.location.search)
    if (m) return decodeURIComponent(m[1])
    const env = import.meta.env.VITE_SIMBRIEF_USERNAME
    return env && env.trim() ? env.trim() : null
  }

  /* Interroge l'API SimBrief et affiche le logo de la compagnie */
  function lireSimBrief(identifiant) {
    const cle = /^\d+$/.test(identifiant) ? 'userid' : 'username'
    const url =
      'https://www.simbrief.com/api/xml.fetcher.php?json=v2&' +
      cle + '=' + encodeURIComponent(identifiant)

    fetch(url, { cache: 'no-store' })
      .then(reponse => {
        if (!reponse.ok) throw new Error('HTTP ' + reponse.status)
        return reponse.json()
      })
      .then(data => {
        const code = data && data.general && data.general.icao_airline
        if (code && String(code).trim()) afficher(String(code).trim().toUpperCase())
      })
      .catch(erreur => console.warn('[overlay] SimBrief inaccessible :', erreur))
  }

  /* Mode manuel : ?cie=AFR ou #AFR dans l'URL */
  function codeManuel() {
    const trouve = new RegExp('[?&]' + PARAMETRE + '=([^&#]*)').exec(window.location.search)
    if (trouve) return decodeURIComponent(trouve[1])
    if (window.location.hash.length > 1) return decodeURIComponent(window.location.hash.slice(1))
    return null
  }

  function verifierNouvelleBuild() {
    try {
      const url = new URL('build-time.json', window.location.href)
      url.searchParams.set('_', String(Date.now()))
      fetch(url.toString())
        .then(reponse => {
          if (!reponse.ok) return
          return reponse.json()
        })
        .then(data => {
          if (data && data.t > CURRENT_BUILD_TIME) {
            const freshUrl = new URL(window.location.href)
            freshUrl.searchParams.set('_v', String(data.t))
            window.location.replace(freshUrl.toString())
          }
        })
        .catch(() => {})
    } catch (e) {}
  }

  onMounted(() => {
    window.addEventListener('hashchange', () => {
      const code = codeManuel()
      if (code) afficher(code)
    })

    /* API publique : overlay.compagnie('AFR') / overlay.liste() depuis la console OBS */
    window.overlay = {
      compagnie: afficher,
      liste: () => Object.keys(COMPAGNIES),
    }

    /* Mode manuel prioritaire (?cie= ou #CODE) */
    const manuel = codeManuel()
    if (manuel) {
      afficher(manuel)
      return
    }

    /* Mode SimBrief : polling toutes les 30 s */
    const simbrief = parametreSimBrief()
    if (simbrief) {
      lireSimBrief(simbrief)
      setInterval(() => lireSimBrief(simbrief), SIMBRIEF_INTERVALLE_MS)
    }

    setInterval(verifierNouvelleBuild, 60000)
  })

  return { logoSrc, logoAlt }
}
