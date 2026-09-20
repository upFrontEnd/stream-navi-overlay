/* ==========================================================================
   Capture une image du rendu de l'overlay (dist/index.html) avec Playwright.
   Utilise en CI apres chaque push pour tenir docs/preview.png a jour.
   ========================================================================== */

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const racine = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distIndex = path.join(racine, "dist", "index.html");
const fichierSortie = path.join(racine, "docs", "preview.png");

if (!fs.existsSync(distIndex)) {
  console.error("dist/index.html introuvable : lance `bun run build` avant `bun run screenshot`.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(fichierSortie), { recursive: true });

const navigateur = await chromium.launch();
const page = await navigateur.newPage({
  viewport: { width: 392, height: 625 },
  deviceScaleFactor: 2,
});

await page.goto("file://" + distIndex);
await page.waitForTimeout(500); // laisse le temps au JS (badge, etc.) de s'appliquer

await page.screenshot({ path: fichierSortie, omitBackground: true });
await navigateur.close();

console.log("Capture enregistree :", fichierSortie);
