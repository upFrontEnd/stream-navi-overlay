import { readdirSync, unlinkSync } from "fs";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

try {
  readdirSync(".")
    .filter((f) => f.startsWith("vite.config.js.timestamp-"))
    .forEach((f) => unlinkSync(f));
} catch {}

const BUILD_TIME = Date.now();

function buildTimePlugin() {
  return {
    name: "build-time",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "build-time.json",
        source: JSON.stringify({ t: BUILD_TIME }),
      });
    },
  };
}

export default defineConfig({
  define: {
    __BUILD_TIME__: BUILD_TIME,
  },
  plugins: [buildTimePlugin(), viteSingleFile()],
  css: {
    devSourcemap: true,
  },
  server: {
    open: true,
  },
  build: {
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
  },
});
