/* ==========================================================================
   Overlay Twitch - Support MEMU
   Affiche le logo de la compagnie aerienne dans le bandeau du haut,
   pilote automatiquement par le CALLSIGN expose par StreamFlight
   (https://flightsim.to/addon/98415/streamflight-your-obs-streaming-companion).
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Les compagnies. La cle est le prefixe ICAO du callsign (AFR,
        EZY, RYR...), aussi utilisable manuellement via l'URL. Le
        fichier du logo est cherche dans public/logos/ ; celles listees
        ici sans logo (ou dont le fichier est absent) se contentent de
        masquer le bandeau (voir plus bas).
        Format conseille : PNG ou SVG a fond transparent, hauteur 60 px
        minimum pour rester net si --scale depasse 1.

        Codes ICAO et noms extraits du dataset ouvert OpenFlights
        (https://github.com/jpatokal/openflights, data/airlines.dat),
        limites aux compagnies court/moyen-courrier europeennes les plus
        courantes. Pour en ajouter une : chercher son code ICAO dans ce
        dataset et ajouter une entree ci-dessous.
     ------------------------------------------------------------------ */

  var DOSSIER_LOGOS = "logos/";

  var COMPAGNIES = {
    AFR: { nom: "Air France", logo: "air-france.svg" },
    TVF: { nom: "Transavia", logo: "transavia.svg" },
    EZY: { nom: "easyJet", logo: "easyjet.svg" },
    RYR: { nom: "Ryanair", logo: "ryanair.svg" },
    VLG: { nom: "Vueling", logo: "vueling.svg" },
    KLM: { nom: "KLM", logo: "klm.svg" },
    DLH: { nom: "Lufthansa", logo: "lufthansa.svg" },
    BAW: { nom: "British Airways", logo: "british-airways.svg" },
    IBE: { nom: "Iberia", logo: "iberia.svg" },
    WZZ: { nom: "Wizz Air", logo: "wizz-air.svg" },
    VOE: { nom: "Volotea", logo: "volotea.svg" },
    CRL: { nom: "Corsair", logo: "corsair.png" },
    FWI: { nom: "Air Caraibes", logo: "air-caraibes.svg" },
    TAP: { nom: "TAP Air Portugal", logo: "tap-air-portugal.svg" },
    SWR: { nom: "SWISS", logo: "swiss.svg" },
    AUA: { nom: "Austrian Airlines", logo: "austrian.svg" },
    DAT: { nom: "Brussels Airlines", logo: "brussels-airlines.svg" },
    NAX: { nom: "Norwegian", logo: "norwegian.svg" },
    FIN: { nom: "Finnair", logo: "finnair.svg" },
    THY: { nom: "Turkish Airlines", logo: "turkish-airlines.svg" },
    PGT: { nom: "Pegasus Airlines", logo: "pegasus.svg" },
    CFG: { nom: "Condor", logo: "condor.svg" },
    EWG: { nom: "Eurowings", logo: "eurowings.svg" },
    EIN: { nom: "Aer Lingus", logo: "aer-lingus.svg" },
    AMC: { nom: "Air Malta", logo: "air-malta.svg" },
    LGL: { nom: "Luxair", logo: "luxair.svg" },
    CTN: { nom: "Croatia Airlines", logo: "croatia-airlines.svg" },
    ASL: { nom: "Air Serbia", logo: "air-serbia.svg" },
    AEE: { nom: "Aegean Airlines", logo: "aegean.svg" },
    TJT: { nom: "Twin Jet", logo: "twin-jet.svg" },
    DAH: { nom: "Air Algerie", logo: "air-algerie.svg" }
  };

  /* Compagnie affichee par defaut, tant qu'aucun callsign n'est lu */
  var DEFAUT = "AFR";

  /* Nom du parametre d'URL pour forcer une compagnie manuellement,
     utile en test : index.html?cie=AFR (desactive alors le suivi
     StreamFlight pour cette session) */
  var PARAMETRE = "cie";

  /* ------------------------------------------------------------------
     2. Ecran transparent : index.html?ecran=transparent

        Rend .screen transparent (fond degrade + carte masques) pour
        laisser apparaitre, dans OBS, une source placee en-dessous
        (ex. Capture de fenetre Navigraph) a travers ce rectangle,
        tout en gardant le cadre/coins/badge visibles au-dessus.
        Cadrage/position de cette source dans OBS : reglage manuel.
     ------------------------------------------------------------------ */

  var PARAMETRE_ECRAN = "ecran";
  var VALEUR_ECRAN_TRANSPARENT = "transparent";

  function ecranTransparentDemande() {
    var trouve = new RegExp("[?&]" + PARAMETRE_ECRAN + "=([^&#]*)").exec(window.location.search);
    return !!trouve && decodeURIComponent(trouve[1]).toLowerCase() === VALEUR_ECRAN_TRANSPARENT;
  }

  var ecran = document.querySelector(".screen");
  if (ecran && ecranTransparentDemande()) {
    ecran.classList.add("screen--transparent");
  }

  /* ------------------------------------------------------------------
     3a. SimBrief : lecture du callsign depuis le dernier plan de vol.

         Parametre URL : ?simbrief=USERNAME  (nom de compte SimBrief)
                      ou ?simbrief=12345     (Pilot ID numerique)
         Exemple OBS : ...dist/index.html?simbrief=monpseudo

         L'overlay interroge l'API SimBrief toutes les 30 s et affiche
         le logo correspondant a general.icao_airline (code ICAO de la
         compagnie, ex. "AFR").  Le parametre ?cie= reste prioritaire.

         Quand ?simbrief= est absent, l'overlay bascule sur StreamFlight
         (section 3b) pour rester compatible avec l'ancienne config.
     ------------------------------------------------------------------ */

  var SIMBRIEF_INTERVALLE_MS = 30000;

  /* Priorite : ?simbrief= dans l'URL (test) > variable de build > null */
  function parametreSimBrief() {
    var m = /[?&]simbrief=([^&#]+)/.exec(window.location.search);
    if (m) return decodeURIComponent(m[1]);
    var env = import.meta.env.VITE_SIMBRIEF_USERNAME;
    return env && env.trim() ? env.trim() : null;
  }

  function lireSimBrief(identifiant) {
    var cle = /^\d+$/.test(identifiant) ? "userid" : "username";
    var url =
      "https://www.simbrief.com/api/xml.fetcher.php?json=v2&" +
      cle + "=" + encodeURIComponent(identifiant);

    fetch(url, { cache: "no-store" })
      .then(function (reponse) {
        if (!reponse.ok) throw new Error("HTTP " + reponse.status);
        return reponse.json();
      })
      .then(function (data) {
        var code = data && data.general && data.general.icao_airline;
        if (code && String(code).trim()) {
          afficher(String(code).trim().toUpperCase());
        }
      })
      .catch(function (erreur) {
        console.warn("[overlay] SimBrief inaccessible :", erreur);
      });
  }

  /* ------------------------------------------------------------------
     3b. StreamFlight : fallback si ?simbrief= n'est pas fourni.

         Pointe le dossier "Output" de StreamFlight vers dist/ pour que
         le chemin relatif "callsign.txt" soit resolu correctement.
     ------------------------------------------------------------------ */

  var STREAMFLIGHT_ACTIF = true;
  var STREAMFLIGHT_FICHIER = "callsign.txt";
  var STREAMFLIGHT_INTERVALLE_MS = 2000;

  /* ------------------------------------------------------------------
     4. Mecanique d'affichage
     ------------------------------------------------------------------ */

  var logo = document.querySelector("[data-logo]");

  function afficher(code) {
    if (!logo) return;

    var cle = String(code || "").trim().toUpperCase();
    var compagnie = COMPAGNIES[cle];

    if (!compagnie || !compagnie.logo) return;

    var nouveauSrc = DOSSIER_LOGOS + compagnie.logo;
    if (logo.getAttribute("src") === nouveauSrc) return;

    logo.alt = compagnie.nom;
    logo.src = nouveauSrc;
  }

  function codeManuel() {
    var trouve = new RegExp("[?&]" + PARAMETRE + "=([^&#]*)").exec(window.location.search);
    if (trouve) return decodeURIComponent(trouve[1]);

    /* Variante acceptee aussi : index.html#AFR */
    if (window.location.hash.length > 1) {
      return decodeURIComponent(window.location.hash.slice(1));
    }

    return null;
  }

  /* ------------------------------------------------------------------
     5. Extraction du prefixe compagnie depuis un callsign
        (ex. "AFR1234" ou "EZY23FR" -> "AFR" / "EZY")
     ------------------------------------------------------------------ */

  function compagnieDepuisCallsign(texte) {
    var lettres = /^[A-Za-z]+/.exec(String(texte || "").trim());
    if (!lettres) return null;

    /* Prefixe complet d'abord (couvre un eventuel code hors norme ICAO),
       puis repli sur les 3 premieres lettres (norme ICAO compagnie,
       ex. "AFR" dans "AFR1234"). */
    var complet = lettres[0].toUpperCase();
    if (COMPAGNIES[complet]) return complet;
    return complet.slice(0, 3);
  }

  var callsignPrecedent = null;
  var avertissementEmis = false;

  function lireStreamFlight() {
    fetch(STREAMFLIGHT_FICHIER, { cache: "no-store" })
      .then(function (reponse) {
        if (!reponse.ok) throw new Error("HTTP " + reponse.status);
        return reponse.text();
      })
      .then(function (texte) {
        var callsign = texte.trim();
        if (!callsign || callsign === callsignPrecedent) return;
        callsignPrecedent = callsign;

        var code = compagnieDepuisCallsign(callsign);
        /* N'appeler afficher que si la compagnie est referencee.
           Un callsign inconnu (VFR, ferry, etc.) garde l'affichage en cours. */
        if (code && COMPAGNIES[code]) {
          afficher(code);
        }
      })
      .catch(function (erreur) {
        /* Fichier absent tant que StreamFlight n'est pas connecte au sim :
           on garde l'affichage courant et on reessaie au prochain intervalle. */
        if (!avertissementEmis) {
          avertissementEmis = true;
          console.warn(
            "[overlay] Impossible de lire " + STREAMFLIGHT_FICHIER +
            " (StreamFlight non connecte, ou nom/chemin de fichier a corriger dans js/overlay.js) :",
            erreur
          );
        }
      });
  }

  /* Changement d'ancre sans rechargement (mode manuel) */
  window.addEventListener("hashchange", function () {
    afficher(codeManuel() || DEFAUT);
  });

  /* ------------------------------------------------------------------
     6. Pilotage depuis l'exterieur
        overlay.compagnie("AFR")  change la compagnie a chaud
        overlay.liste()           renvoie les codes disponibles
        Utilisable dans la console de la source navigateur d'OBS,
        ou depuis un script si l'overlay est charge dans une page.
     ------------------------------------------------------------------ */

  window.overlay = {
    compagnie: afficher,
    liste: function () {
      return Object.keys(COMPAGNIES);
    }
  };

  function demarrer() {
    var manuel = codeManuel();

    if (manuel) {
      /* ?cie= ou #... present : mode manuel, toute integration desactivee */
      afficher(manuel);
      return;
    }

    /* Le logo par defaut (AFR) est deja dans l'attribut src du HTML.
       On demarre le suivi sans ecraser l'affichage. */

    var simbrief = parametreSimBrief();
    if (simbrief) {
      /* Mode SimBrief : interroge l'API toutes les 30 s */
      lireSimBrief(simbrief);
      setInterval(function () { lireSimBrief(simbrief); }, SIMBRIEF_INTERVALLE_MS);
      return;
    }

    /* Fallback StreamFlight : lit callsign.txt toutes les 2 s */
    if (STREAMFLIGHT_ACTIF) {
      lireStreamFlight();
      setInterval(lireStreamFlight, STREAMFLIGHT_INTERVALLE_MS);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrer);
  } else {
    demarrer();
  }
})();
