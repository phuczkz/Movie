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
      if (!slug || typeof logo !== "string" || !logo) return;
      if (cache[slug] !== logo) {
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
      const url = await getTmdbLogo(name, originName, year);
      if (slug && typeof url === "string" && url) {
        persistLogos([{ slug, logo: url }]);
      }
      return url;
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
      return typeof cachedLogo === "string" && cachedLogo ? cachedLogo : undefined;
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
          const logo = await getTmdbLogo(name, originName, year);
          if (slug && typeof logo === "string" && logo) {
            persistLogos([{ slug, logo }]);
          }
          return logo || null;
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
          return typeof cachedLogo === "string" && cachedLogo ? cachedLogo : undefined;
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
