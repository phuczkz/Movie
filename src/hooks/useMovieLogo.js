import { useQuery } from "@tanstack/react-query";
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
      if (slug) persistLogos([{ slug, logo: url }]);
      return url;
    },
    enabled: !!(name || originName),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
    initialData: () => {
      if (!slug) return undefined;
      const cache = getPersistedLogos();
      return cache[slug] || undefined;
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
  const listKey = list.map((m) => m.slug).join(",");

  const { data: logoMap = new Map(), isLoading } = useQuery({
    queryKey: ["movie-logos", listKey],
    queryFn: async () => {
      const results = await Promise.allSettled(
        list.map(async (m) => {
          const name = m.name || "";
          const originName = m.origin_name || "";
          const year = m.year;
          const logo = await getTmdbLogo(name, originName, year);
          return { slug: m.slug, logo };
        })
      );

      const map = new Map();
      const toPersist = [];
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value) {
          map.set(r.value.slug, r.value.logo);
          toPersist.push(r.value);
        }
      });
      persistLogos(toPersist);
      return map;
    },
    enabled: list.length > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
    initialData: () => {
      if (!list.length) return undefined;
      const cache = getPersistedLogos();
      const map = new Map();
      let hasAny = false;
      list.forEach((m) => {
        if (cache[m.slug] !== undefined) {
          map.set(m.slug, cache[m.slug]);
          hasAny = true;
        }
      });
      return hasAny ? map : undefined;
    },
  });

  return { logoMap, isLoading };
};
