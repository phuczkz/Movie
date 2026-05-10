import { useQuery } from "@tanstack/react-query";
import { getCategory, getCountry, searchMovies, getByYear } from "../api/movies";
import {
  getKKphimByCategory,
  getKKphimByCountry,
  searchKKphim,
  getKKphimByYear,
} from "../api/kkphim";
import { comicApi } from "../api/comicApi";
import { filterAdultMovies } from "../utils/filter";

const slugify = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const parseEpisodeCount = (str) => {
  if (!str) return 0;
  // Match the first number found (e.g., "Tập 12" -> 12, "12/12" -> 12)
  const match = String(str).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const smartDedupe = (items = []) => {
  const map = new Map();
  const results = [];

  for (const it of items) {
    if (!it) continue;

    const slug = it.slug || it._id || it.id;
    const name = (it.name || "").toLowerCase().trim();
    const originName = (it.origin_name || "").toLowerCase().trim();
    const year = it.year;

    // Build a set of potential identity keys
    const identityKeys = new Set();
    if (slug) identityKeys.add(`slug:${slug}`);
    
    // We only use Name/OriginName as keys if they are substantial
    if (year) {
      if (originName && originName.length > 2) identityKeys.add(`origin:${originName}|${year}`);
      if (name && name.length > 2) identityKeys.add(`name:${name}|${year}`);
    }

    // Check if any key already exists in our map
    let existing = null;
    for (const key of identityKeys) {
      if (map.has(key)) {
        existing = map.get(key);
        break;
      }
    }

    if (existing) {
      const currentEpisodes = parseEpisodeCount(it.episode_current);
      const existingEpisodes = parseEpisodeCount(existing.episode_current);

      // If the new one has more episodes, we replace the existing one
      if (currentEpisodes > existingEpisodes) {
        // Update all associated keys to point to the new item
        for (const key of identityKeys) {
          map.set(key, it);
        }
        // Also ensure the old item's slug points to the new one in case it was different
        if (existing.slug) map.set(`slug:${existing.slug}`, it);
      }
    } else {
      // New item: map all its identity keys to it
      for (const key of identityKeys) {
        map.set(key, it);
      }
    }
  }

  // Use a Set to get unique movie objects from the map values
  return Array.from(new Set(map.values()));
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
        const items = res?.data?.items || [];
        return filterAdultMovies(items);
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

      return filterAdultMovies(smartDedupe(results.flat().filter(Boolean)));
    },
    enabled: Boolean(query?.trim()),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
