import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },
  build: {
    modulePreload: {
      resolveDependencies(_filename, deps) {
        // Prevent preloading heavy, route-specific chunks on the initial HTML.
        // These should load only when their dynamic imports are executed.
        return deps.filter((dep) => {
          return (
            !dep.includes("vendor-hls") &&
            !dep.includes("vendor-player") &&
            !dep.includes("dash.all")
          );
        });
      },
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Keep only truly shared, core dependencies in stable chunks.
            // Avoid forcing *all* dependencies into one big vendor chunk,
            // otherwise route-level lazy imports (e.g. react-player, hls.js)
            // get pulled into the initial page load and show up as "unused JS".
            if (id.includes("firebase")) return "vendor-fb";
            if (id.includes("hls.js")) return "vendor-hls";
            if (id.includes("react-player")) return "vendor-player";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("react-router-dom")) return "vendor-router";
            if (
              id.includes("react-dom") ||
              id.includes("react/jsx-runtime") ||
              id.includes("react/")
            )
              return "vendor-react";
            if (id.includes("axios")) return "vendor-axios";

            // Let Rollup decide the rest; this preserves async chunking.
            return undefined;
          }
        },
      },
    },
  },
});
