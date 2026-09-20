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
    CRL: { nom: "Corsair", logo: "corsair.svg" },
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
    TJT: { nom: "Twin Jet", logo: "twin-jet.svg" }
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
     3. StreamFlight : lecture du callsign en direct.

        StreamFlight ecrit des fichiers texte dans un dossier "Output"
        configure dans son interface (ex. flight_phase.txt, vspeed.txt).
        Pointe ce dossier Output vers le MEME dossier que le index.html
        de cet overlay (dist/ apres bun run build), pour que le chemin
        relatif ci-dessous fonctionne tel quel.

        Nom de fichier non documente officiellement pour le callsign :
        "callsign.txt" est la convention la plus probable (coherente
        avec flight_phase.txt / vspeed.txt / altitude.txt). A adapter
        ici si StreamFlight utilise un autre nom chez toi.
     ------------------------------------------------------------------ */

  var STREAMFLIGHT_ACTIF = true;
  var STREAMFLIGHT_FICHIER = "callsign.txt";
  var STREAMFLIGHT_INTERVALLE_MS = 2000;

  /* ------------------------------------------------------------------
     4. Mecanique d'affichage
     ------------------------------------------------------------------ */

  var logo = document.querySelector("[data-logo]");

  function masquerLogo() {
    logo.hidden = true;
    logo.removeAttribute("src");
  }

  function afficher(code) {
    if (!logo) return;

    var cle = String(code || "").trim().toUpperCase();
    var compagnie = COMPAGNIES[cle];

    if (!compagnie || !compagnie.logo) {
      masquerLogo();
      return;
    }

    /* Masque le logo si le fichier est absent ou illisible */
    logo.onerror = masquerLogo;
    logo.onload = function () {
      logo.hidden = false;
    };

    logo.alt = compagnie.nom;
    logo.hidden = true;
    logo.src = DOSSIER_LOGOS + compagnie.logo;
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
        afficher(code || DEFAUT);
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
      /* ?cie= ou #... present : mode manuel, StreamFlight desactive pour la session */
      afficher(manuel);
      return;
    }

    afficher(DEFAUT);

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
