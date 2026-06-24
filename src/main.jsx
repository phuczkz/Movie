import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AppModeProvider } from "./context/AppModeContext.jsx";
import MaintenanceGuard from "./components/MaintenanceGuard.jsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,              // Reduced from 2 — less request spam on slow networks
      networkMode: 'online', // Only fetch when browser is online
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
          const ophimCdn = import.meta.env.VITE_MOVIE_IMAGE_CDN || "";
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
          <AppModeProvider>
            <MaintenanceGuard>
              <App />
            </MaintenanceGuard>
          </AppModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
