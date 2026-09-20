/* ==========================================================================
   Overlay Twitch - Support MEMU
   Affiche le logo de la compagnie aerienne dans le bandeau du haut.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Les compagnies. Une entree par compagnie, la cle est le code
        utilise dans l'URL. Le fichier du logo est cherche dans logos/.
        Format conseille : PNG ou SVG a fond transparent, hauteur 60 px
        minimum pour rester net si --scale depasse 1.
     ------------------------------------------------------------------ */

  var DOSSIER_LOGOS = "logos/";

  var COMPAGNIES = {
    AFR: { nom: "Air France", logo: "air-france.svg" },
    TVF: { nom: "Transavia", logo: "transavia.svg" },
    EZY: { nom: "easyJet", logo: "easyjet.svg" },
    RYR: { nom: "Ryanair", logo: "ryanair.svg" },
    VLG: { nom: "Vueling", logo: "vueling.svg" },
    MEMU: { nom: "MEMU" }
  };

  /* Compagnie affichee si l'URL n'en precise aucune */
  var DEFAUT = "MEMU";

  /* Nom du parametre d'URL : index.html?cie=AFR */
  var PARAMETRE = "cie";

  /* ------------------------------------------------------------------
     2. Mecanique
     ------------------------------------------------------------------ */

  var logo = document.querySelector("[data-logo]");
  var nom = document.querySelector("[data-nom]");

  function afficherTexte(texte) {
    logo.hidden = true;
    logo.removeAttribute("src");
    nom.textContent = texte;
    nom.hidden = false;
  }

  function afficher(code) {
    if (!logo || !nom) return;

    var cle = String(code || "").trim().toUpperCase();
    var compagnie = COMPAGNIES[cle];

    if (!compagnie) {
      afficherTexte(cle || DEFAUT);
      return;
    }

    if (!compagnie.logo) {
      afficherTexte(compagnie.nom);
      return;
    }

    /* Repli sur le nom en texte si le fichier est absent ou illisible */
    logo.onerror = function () {
      afficherTexte(compagnie.nom);
    };
    logo.onload = function () {
      nom.hidden = true;
      logo.hidden = false;
    };

    logo.alt = compagnie.nom;
    logo.hidden = true;
    logo.src = DOSSIER_LOGOS + compagnie.logo;
  }

  function codeDemande() {
    var trouve = new RegExp("[?&]" + PARAMETRE + "=([^&#]*)").exec(window.location.search);
    if (trouve) return decodeURIComponent(trouve[1]);

    /* Variante acceptee aussi : index.html#AFR */
    if (window.location.hash.length > 1) {
      return decodeURIComponent(window.location.hash.slice(1));
    }

    return DEFAUT;
  }

  /* Changement d'ancre sans rechargement */
  window.addEventListener("hashchange", function () {
    afficher(codeDemande());
  });

  /* ------------------------------------------------------------------
     3. Pilotage depuis l'exterieur
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      afficher(codeDemande());
    });
  } else {
    afficher(codeDemande());
  }
})();
