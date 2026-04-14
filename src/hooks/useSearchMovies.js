import { useQuery } from "@tanstack/react-query";
import { getCategory, getCountry, searchMovies, getByYear } from "../api/movies";
import {
  getKKphimByCategory,
  getKKphimByCountry,
  searchKKphim,
  getKKphimByYear,
} from "../api/kkphim";
import { comicApi } from "../api/comicApi";

const slugify = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const dedupeBySlug = (items = []) => {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it?.slug || it?._id || it?.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
};

export const useSearchMovies = (query, appMode = "movie", page = 1) =>
  useQuery({
    queryKey: ["search", query, appMode, page],
    queryFn: async () => {
      const q = (query || "").trim();
      if (!q) return [];

      const safe = async (fn) => {
        try {
          const res = await fn();
          return res || [];
        } catch {
          return [];
        }
      };

      if (appMode === "comic") {
        const res = await safe(() => comicApi.search(q));
        // otruyenapi structure: { data: { items: [...] } }
        return res?.data?.items || [];
      }

      // Default: Movie search
      const isYear = /^\d{4}$/.test(q);
      const slug = slugify(q);

      const requests = [
        safe(() => searchKKphim(q, page)),
        safe(() => searchMovies(q, page)),
        safe(() => getKKphimByCategory(slug)),
        safe(() => getKKphimByCountry(slug)),
        safe(() => getCategory(slug)),
        safe(() => getCountry(slug)),
      ];

      if (isYear) {
        requests.push(safe(() => getKKphimByYear(q, page)));
        requests.push(safe(() => getByYear(q, page)));
      }

      const results = await Promise.all(requests);

      return dedupeBySlug(results.flat());
    },
    enabled: Boolean(query?.trim()),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
