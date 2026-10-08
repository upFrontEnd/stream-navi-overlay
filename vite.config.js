import { readdirSync, unlinkSync } from "fs";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

try {
  readdirSync(".")
    .filter((f) => f.startsWith("vite.config.js.timestamp-"))
    .forEach((f) => unlinkSync(f));
} catch {}


export default defineConfig({
  plugins: [viteSingleFile()],
  css: {
    devSourcemap: true,
  },
  server: {
    open: true,
  },
  build: {
    // Un seul index.html autonome (JS/CSS/images inlines) : necessaire pour
    // OBS Source navigateur > Fichier local, qui charge le fichier en file://
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
  },
});
