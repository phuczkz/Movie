import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "unsafe-none",
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
            !dep.includes("vendor-artplayer") &&
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
          // Firebase chunk separation to reduce entry bundle size
          if (id.includes("firebase")) {
            return "vendor-firebase";
          }
          if (id.includes("node_modules")) {
            // Group core React dependencies together as they are used everywhere
            if (
              id.includes("react-dom") ||
              id.includes("react/jsx-runtime") ||
              id.includes("react/")
            ) {
              return "vendor-react";
            }
            
            // For other libraries like Firebase, HLS, Artplayer, etc., 
            // we let Vite/Rollup decide the best splitting strategy.
            // This ensures they are only loaded on routes that actually need them.
            return undefined;
          }
        },
      },
    },
  },
});
