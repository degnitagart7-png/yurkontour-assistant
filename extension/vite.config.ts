import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

// Extension build uses a multi-step approach:
// 1. Main build: Side Panel (HTML + React) as the primary entry
// 2. Additional entries: background.ts and content_scripts/index.ts as library builds
// We use a custom plugin to handle the non-HTML entries separately.

export default defineConfig(({ mode }) => ({
  // Use relative paths so Chrome extension can resolve assets correctly
  base: "",
  plugins: [
    react(),
    // Plugin to copy manifest.json and icons to dist after build
    {
      name: "copy-extension-assets",
      closeBundle() {
        const distDir = resolve(__dirname, "dist");
        const publicDir = resolve(__dirname, "public");

        // Copy manifest.json
        if (existsSync(resolve(publicDir, "manifest.json"))) {
          copyFileSync(
            resolve(publicDir, "manifest.json"),
            resolve(distDir, "manifest.json")
          );
        }

        // Copy icons
        const iconsDir = resolve(distDir, "icons");
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true });
        }
        for (const icon of ["icon16.png", "icon48.png", "icon128.png"]) {
          const src = resolve(publicDir, "icons", icon);
          if (existsSync(src)) {
            copyFileSync(src, resolve(iconsDir, icon));
          }
        }
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel/index.html"),
        background: resolve(__dirname, "background.ts"),
        "content_scripts/index": resolve(__dirname, "content_scripts/index.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") return "background.js";
          if (chunkInfo.name === "content_scripts/index")
            return "content_scripts/index.js";
          return "[name].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "sidepanel/styles.css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
}));
