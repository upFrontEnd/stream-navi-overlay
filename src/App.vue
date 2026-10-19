<script setup>
/*
  Overlay Twitch - Support MEMU
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
</script>

<template>
  <div class="overlay">

    <div class="frame-glow"></div>
    <div class="frame"></div>
    <svg class="panel" viewBox="0 0 392 625" aria-hidden="true">
      <defs>
        <linearGradient id="panel-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#02060b" stop-opacity=".5"/>
          <stop offset=".6" stop-color="#050b12" stop-opacity=".4"/>
          <stop offset="1" stop-color="#050a10" stop-opacity=".6"/>
        </linearGradient>
        <linearGradient id="groove-stroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#4a86c8" stop-opacity=".25"/>
          <stop offset=".5" stop-color="#6fb0f0" stop-opacity=".5"/>
          <stop offset="1" stop-color="#8fd0ff" stop-opacity=".7"/>
        </linearGradient>
        <linearGradient id="streak-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#7fc4ff" stop-opacity="0"/>
          <stop offset=".5" stop-color="#9fd8ff" stop-opacity=".85"/>
          <stop offset="1" stop-color="#7fc4ff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="panel__fill" d="M39,46 H353 Q373,46 373,66 V560 C373,575 366,585 347,595 L295,612 Q285,618 270,618 H122 Q107,618 97,612 L45,595 C26,585 19,575 19,560 V66 Q19,46 39,46 Z M39,61 H355 V582 H39 Z"/>
      <path class="panel__groove-shadow" d="M20.5,66 V560 C20.5,575 27,585 46,595 L98,612 Q108,619.5 122,619.5 H270 Q284,619.5 294,613 L346,596 C365,586 371.5,575 371.5,560 V66 Q371.5,47.5 353,47.5 H39 Q20.5,47.5 20.5,66 Z"/>
      <path class="panel__groove" d="M19,66 V560 C19,575 26,585 45,595 L97,612 Q107,618 122,618 H270 Q285,618 295,612 L347,595 C366,585 373,575 373,560 V66 Q373,46 353,46 H39 Q19,46 19,66 Z"/>
      <path class="panel__streak" d="M115,611 H277"/>
      <path class="panel__runner" pathLength="100" d="M19,66 V560 C19,575 26,585 45,595 L97,612 Q107,618 122,618 H270 Q285,618 295,612 L347,595 C366,585 373,575 373,560 V66 Q373,46 353,46 H39 Q19,46 19,66 Z"/>
    </svg>
    <div class="plate"></div>
    <div class="ruler ruler--left"></div>
    <div class="ruler ruler--right"></div>
    <i class="screw screw--tl"></i>
    <i class="screw screw--tr"></i>
    <i class="screw screw--bl"></i>
    <i class="screw screw--br"></i>
    <i class="screw screw--small screw--ml-t"></i>
    <i class="screw screw--small screw--mr-t"></i>
    <i class="screw screw--small screw--ml-b"></i>
    <i class="screw screw--small screw--mr-b"></i>
    <span class="btn-label btn-label--range">Range</span>
    <span class="btn-label btn-label--mode">Mode</span>
    <span class="btn-label btn-label--charts">Charts</span>
    <div class="btn btn--range"></div>
    <div class="btn btn--blank"></div>
    <div class="btn btn--mode"></div>
    <div class="btn btn--charts"></div>
    <span class="btn-arrows">&#8679;<br>&#8681;</span>

    <div class="led-green"></div>

    <div class="badge">
      <img class="badge__logo" :src="logoSrc" :alt="logoAlt">
    </div>

  </div>
</template>
