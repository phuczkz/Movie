import { useQuery } from "@tanstack/react-query";
import { getTmdbLogo } from "../api/tmdb";

/**
 * Fetches the TMDB logo image URL for a given movie.
 * Returns { logoUrl, isLoading }.
 * logoUrl is null when no logo exists – caller should fall back to text.
 */
export const useMovieLogo = (movie) => {
  const name = movie?.name || "";
  const originName = movie?.origin_name || "";
  const year = movie?.year;

  const { data: logoUrl = null, isLoading } = useQuery({
    queryKey: ["movie-logo", name, originName, year],
    queryFn: () => getTmdbLogo(name, originName, year),
    enabled: !!(name || originName),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  return { logoUrl, isLoading };
};

/**
 * Fetches logo URLs for multiple movies (used by Hero carousel).
 * Returns a Map<slug, logoUrl | null>.
 */
export const useMovieLogos = (movies = []) => {
  const list = movies.filter(Boolean);

  const { data: logoMap = new Map(), isLoading } = useQuery({
    queryKey: ["movie-logos", list.map((m) => m.slug).join(",")],
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
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value) {
          map.set(r.value.slug, r.value.logo);
        }
      });
      return map;
    },
    enabled: list.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false,
  });

  return { logoMap, isLoading };
};
