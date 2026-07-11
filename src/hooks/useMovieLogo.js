import { useQuery, useQueries } from "@tanstack/react-query";
import { getTmdbLogo } from "../api/tmdb";

const LOGO_CACHE_KEY = "tmdb_logo_cache_v1";

const getPersistedLogos = () => {
  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const persistLogos = (items) => {
  try {
    const cache = getPersistedLogos();
    let changed = false;
    items.forEach(({ slug, logo }) => {
      // logo is now an object { url, lang } or a string (for old cache)
      if (!slug || !logo) return;
      const cached = cache[slug];
      // Compare based on JSON stringification to detect changes
      if (JSON.stringify(cached) !== JSON.stringify(logo)) {
        cache[slug] = logo;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) {
    console.warn("Failed to persist logos", e);
  }
};

/**
 * Fetches the TMDB logo image URL for a given movie.
 * Returns { logoUrl, isLoading }.
 * logoUrl is null when no logo exists – caller should fall back to text.
 */
export const useMovieLogo = (movie) => {
  const name = movie?.name || "";
  const originName = movie?.origin_name || "";
  const year = movie?.year;
  const slug = movie?.slug;

  const { data: logoUrl = null, isLoading } = useQuery({
    queryKey: ["movie-logo", name, originName, year],
    queryFn: async () => {
      const logoObj = await getTmdbLogo(name, originName, year);
      if (slug && logoObj && logoObj.url) {
        persistLogos([{ slug, logo: logoObj }]);
      }
      return logoObj;
    },
    enabled: !!(name || originName),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    initialData: () => {
      if (!slug) return undefined;
      const cache = getPersistedLogos();
      const cachedLogo = cache[slug];
      if (typeof cachedLogo === "string" && cachedLogo) {
        return { url: cachedLogo, lang: "other" }; // Migrate old cache
      }
      if (cachedLogo && cachedLogo.url) {
        return cachedLogo;
      }
      return undefined;
    },
  });

  return { logoUrl, isLoading };
};

/**
 * Fetches logo URLs for multiple movies (used by Hero carousel).
 * Returns a Map<slug, logoUrl | null>.
 */
export const useMovieLogos = (movies = []) => {
  const list = movies.filter(Boolean);

  const queryResults = useQueries({
    queries: list.map((m, index) => {
      const name = m.name || "";
      const originName = m.origin_name || "";
      const year = m.year;
      const slug = m.slug;

      return {
        queryKey: ["movie-logo", name, originName, year],
        queryFn: async () => {
          if (index > 0) {
            // Delay fetching logos for subsequent slides to prioritize the first slide's assets
            await new Promise((resolve) => setTimeout(resolve, 1500 + index * 500));
          }
          const logoObj = await getTmdbLogo(name, originName, year);
          if (slug && logoObj && logoObj.url) {
            persistLogos([{ slug, logo: logoObj }]);
          }
          return logoObj || null;
        },
        enabled: !!(name || originName),
        staleTime: 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
        initialData: () => {
          if (!slug) return undefined;
          const cache = getPersistedLogos();
          const cachedLogo = cache[slug];
          if (typeof cachedLogo === "string" && cachedLogo) {
            return { url: cachedLogo, lang: "other" }; // Migrate old cache
          }
          if (cachedLogo && cachedLogo.url) {
            return cachedLogo;
          }
          return undefined;
        },
      };
    }),
  });

  const logoMap = new Map();
  list.forEach((m, idx) => {
    const res = queryResults[idx];
    if (res && res.data) {
      logoMap.set(m.slug, res.data);
    }
  });

  const isLoading = queryResults.some((res) => res.isLoading);

  return { logoMap, isLoading };
};

const BACKDROP_CACHE_KEY = "tmdb_backdrop_cache_v1";

const getPersistedBackdrops = () => {
  try {
    const raw = localStorage.getItem(BACKDROP_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const persistBackdrops = (items) => {
  try {
    const cache = getPersistedBackdrops();
    let changed = false;
    items.forEach(({ slug, backdrop }) => {
      if (!slug || typeof backdrop !== "string" || !backdrop) return;
      if (cache[slug] !== backdrop) {
        cache[slug] = backdrop;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(BACKDROP_CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) {
    console.warn("Failed to persist backdrops", e);
  }
};

import { getTmdbBackdrop } from "../api/tmdb";

/**
 * Fetches backdrop URLs for multiple movies (used by Hero carousel).
 * Returns a Map<slug, backdropUrl | null>.
 */
export const useMovieBackdrops = (movies = []) => {
  const list = movies.filter(Boolean);

  const queryResults = useQueries({
    queries: list.map((m, index) => {
      const name = m.name || "";
      const originName = m.origin_name || "";
      const year = m.year;
      const slug = m.slug;

      return {
        queryKey: ["movie-backdrop", name, originName, year],
        queryFn: async () => {
          if (index > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500 + index * 500));
          }
          const backdrop = await getTmdbBackdrop(name, originName, year);
          if (slug && typeof backdrop === "string" && backdrop) {
            persistBackdrops([{ slug, backdrop }]);
          }
          return backdrop || null;
        },
        enabled: !!(name || originName),
        staleTime: 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
        initialData: () => {
          if (!slug) return undefined;
          const cache = getPersistedBackdrops();
          const cachedBg = cache[slug];
          return typeof cachedBg === "string" && cachedBg ? cachedBg : undefined;
        },
      };
    }),
  });

  const backdropMap = new Map();
  list.forEach((m, idx) => {
    const res = queryResults[idx];
    if (res && res.data) {
      backdropMap.set(m.slug, res.data);
    }
  });

  const isLoading = queryResults.some((res) => res.isLoading);

  return { backdropMap, isLoading };
};
