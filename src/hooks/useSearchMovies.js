import { useQuery } from "@tanstack/react-query";
import { getCategory, getCountry, searchMovies } from "../api/movies";
import {
  getKKphimByCategory,
  getKKphimByCountry,
  searchKKphim,
} from "../api/kkphim";

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

export const useSearchMovies = (query, page = 1) =>
  useQuery({
    queryKey: ["search", query, page],
    queryFn: async () => {
      const q = (query || "").trim();
      if (!q) return [];
      const slug = slugify(q);

      const safe = async (fn) => {
        try {
          const res = await fn();
          return res || [];
        } catch {
          return [];
        }
      };

      const [
        kkResults,
        ophimResults,
        kkCat,
        kkCountry,
        ophimCat,
        ophimCountry,
      ] = await Promise.all([
        safe(() => searchKKphim(q, page)),
        safe(() => searchMovies(q, page)),
        safe(() => getKKphimByCategory(slug)),
        safe(() => getKKphimByCountry(slug)),
        safe(() => getCategory(slug)),
        safe(() => getCountry(slug)),
      ]);

      return dedupeBySlug([
        ...kkResults,
        ...ophimResults,
        ...kkCat,
        ...kkCountry,
        ...ophimCat,
        ...ophimCountry,
      ]);
    },
    enabled: Boolean(query?.trim()),
    staleTime: 5 * 60 * 1000,
  });
