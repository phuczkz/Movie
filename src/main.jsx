import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import MaintenanceGuard from "./components/MaintenanceGuard.jsx";
import "./index.css";

// Register Service Worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("SW registered:", reg.scope);
        // Auto-update on new version
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
                console.log("New SW version available – refresh to update");
              }
            });
          }
        });
      })
      .catch((err) => console.warn("SW registration failed:", err));
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});

window.addEventListener(
  "error",
  (e) => {
    if (e.target && e.target.tagName === "IMG") {
      const src = e.target.src || "";
      if (src.includes("phimimg.com/upload/") || src.includes("phiming.com/upload/")) {
        if (!e.target.dataset.fallbackApplied) {
          e.target.dataset.fallbackApplied = "true";
          const ophimCdn = import.meta.env.VITE_MOVIE_IMAGE_CDN || "https://img.ophim.live/uploads/movies/";
          const path = src.split(/phim(?:im)?g\.com\/upload\//)[1];
          e.target.src = `${ophimCdn}${path}`;
        }
      }
    }
  },
  true
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <MaintenanceGuard>
            <App />
          </MaintenanceGuard>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
