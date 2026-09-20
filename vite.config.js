import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
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
