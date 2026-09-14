import { useQuery, useQueries } from "@tanstack/react-query";
import { getTmdbLogo, getTmdbBackdrop, getTmdbHeroAssets } from '@/features/movies/api/tmdb';

/**
 * Extract country slug and movie type from a movie object.
 * Used to pass disambiguation context to TMDB search.
 */
const getMovieContext = (movie) => {
  if (!movie) return {};
  const countrySlug = movie.country?.[0]?.slug || movie.origin?.country?.[0]?.slug || null;
  const type = movie.type || movie.origin?.type || null;
  const tmdbId = movie.tmdb?.id || movie.origin?.tmdb?.id || null;
  const tmdbType = movie.tmdb?.type || movie.origin?.tmdb?.type || null;
  return { countrySlug, type, tmdbId, tmdbType };
};

const LOGO_CACHE_KEY = "tmdb_logo_cache_v2";

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
  const context = getMovieContext(movie);

  const { data: logoUrl = null, isLoading } = useQuery({
    // Include slug and tmdbId in queryKey so movies get separate cache
    queryKey: ["movie-logo", slug, name, originName, year, context.tmdbId],
    queryFn: async () => {
      const logoObj = await getTmdbLogo(name, originName, year, context);
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
      const context = getMovieContext(m);

      return {
        // Include slug and tmdbId in queryKey so movies get separate cache
        queryKey: ["movie-logo", slug, name, originName, year, context.tmdbId],
        queryFn: async () => {
          if (index > 0) {
            // Delay fetching logos for subsequent slides to prioritize the first slide's assets
            await new Promise((resolve) => setTimeout(resolve, 1500 + index * 500));
          }
          const logoObj = await getTmdbLogo(name, originName, year, context);
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

const BACKDROP_CACHE_KEY = "tmdb_backdrop_cache_v2";

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
      const context = getMovieContext(m);

      return {
        // Include slug and tmdbId in queryKey so movies get separate cache
        queryKey: ["movie-backdrop", slug, name, originName, year, context.tmdbId],
        queryFn: async () => {
          if (index > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500 + index * 500));
          }
          const backdrop = await getTmdbBackdrop(name, originName, year, context);
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

/**
 * Hook tối ưu cho Hero Carousel: tải đồng thời cả Logo và Backdrop cho các slide
 * trong 1 query duy nhất mỗi phim, tránh tìm kiếm TMDB lặp lại 2 lần (double search).
 */
export const useHeroAssets = (movies = []) => {
  const list = movies.filter(Boolean);

  const queryResults = useQueries({
    queries: list.map((m, index) => {
      const name = m.name || "";
      const originName = m.origin_name || "";
      const year = m.year;
      const slug = m.slug;
      const context = getMovieContext(m);

      return {
        queryKey: ["movie-hero-assets", slug, name, originName, year, context.tmdbId],
        queryFn: async () => {
          if (index > 0) {
            // Delay fetching assets cho các slide sau để ưu tiên slide đầu tiên hiển thị trước
            await new Promise((resolve) => setTimeout(resolve, 1500 + index * 500));
          }
          const assets = await getTmdbHeroAssets(name, originName, year, context);
          if (slug && assets) {
            if (assets.logo && assets.logo.url) {
              persistLogos([{ slug, logo: assets.logo }]);
            }
            if (assets.backdrop) {
              persistBackdrops([{ slug, backdrop: assets.backdrop }]);
            }
          }
          return assets || { logo: null, backdrop: null };
        },
        enabled: !!(name || originName),
        staleTime: 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
        initialData: () => {
          if (!slug) return undefined;
          const logoCache = getPersistedLogos();
          const backdropCache = getPersistedBackdrops();
          const cachedLogo = logoCache[slug];
          const cachedBg = backdropCache[slug];

          let logo = null;
          if (typeof cachedLogo === "string" && cachedLogo) {
            logo = { url: cachedLogo, lang: "other" };
          } else if (cachedLogo && cachedLogo.url) {
            logo = cachedLogo;
          }

          const backdrop = typeof cachedBg === "string" && cachedBg ? cachedBg : null;

          if (logo || backdrop) {
            return { logo, backdrop };
          }
          return undefined;
        },
      };
    }),
  });

  const logoMap = new Map();
  const backdropMap = new Map();

  list.forEach((m, idx) => {
    const res = queryResults[idx];
    if (res && res.data) {
      if (res.data.logo) {
        logoMap.set(m.slug, res.data.logo);
      }
      if (res.data.backdrop) {
        backdropMap.set(m.slug, res.data.backdrop);
      }
    }
  });

  const isLoading = queryResults.some((res) => res.isLoading);

  return { logoMap, backdropMap, isLoading };
};
