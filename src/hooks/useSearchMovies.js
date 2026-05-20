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
  const match = String(str).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const nameVariants = (raw = "") => {
  const set = new Set();
  const full = (raw || "").toLowerCase().trim();
  if (!full || full.length < 2) return set;
  set.add(full);
  // Part without parentheses
  const stripped = full.replace(/\s*\([^)]*\)/g, "").trim();
  if (stripped && stripped.length > 2 && stripped !== full) set.add(stripped);
  // Content inside parentheses
  const m = full.match(/\(([^)]+)\)/);
  if (m) {
    const inside = m[1].trim();
    if (inside.length > 2) set.add(inside);
  }
  return set;
};

const buildKeys = (item) => {
  const keys = new Set();
  const slug = item.slug || item._id || item.id;
  const year = item.year || "";

  if (slug) keys.add(`slug:${slug}`);

  const vName = nameVariants(item.name || "");
  const vOrigin = nameVariants(item.origin_name || "");

  const addPair = (prefix, value) => {
    if (!value || value.length <= 2) return;
    // Key with year (preferred — avoids false positives across different years)
    if (year) keys.add(`${prefix}:${value}|${year}`);
    // Key without year (fallback — catches when one API lacks year data)
    keys.add(`${prefix}:${value}`);
  };

  // Canonical keys
  vName.forEach((v) => addPair("name", v));
  vOrigin.forEach((v) => addPair("origin", v));

  // Cross-field: one API's name may equal the other's origin_name
  vName.forEach((v) => addPair("origin", v));
  vOrigin.forEach((v) => addPair("name", v));

  return keys;
};

const smartDedupe = (items = []) => {
  // map: key → { item, keys }
  const map = new Map();

  for (const it of items) {
    if (!it) continue;

    const keys = buildKeys(it);

    // Find existing entry by any matching key
    let existing = null;
    let existingKeys = null;
    for (const k of keys) {
      if (map.has(k)) {
        ({ item: existing, keys: existingKeys } = map.get(k));
        break;
      }
    }

    if (existing) {
      // Merge: keep whichever has MORE episodes, but take the MAX episode count
      const cur = parseEpisodeCount(it.episode_current);
      const prev = parseEpisodeCount(existing.episode_current);

      // Build merged item: use base with higher episode count, always take max
      const base = cur >= prev ? it : existing;
      const merged = {
        ...base,
        episode_current:
          cur >= prev ? it.episode_current : existing.episode_current,
        episode_total:
          parseEpisodeCount(it.episode_total) >=
          parseEpisodeCount(existing.episode_total)
            ? it.episode_total
            : existing.episode_total,
      };

      // Union of all keys from both entries
      const allKeys = new Set([...existingKeys, ...keys]);
      const entry = { item: merged, keys: allKeys };
      for (const k of allKeys) map.set(k, entry);
    } else {
      const entry = { item: it, keys };
      for (const k of keys) map.set(k, entry);
    }
  }

  // Deduplicate by reference (map may have multiple keys pointing to same entry)
  const seen = new Set();
  const result = [];
  for (const { item } of map.values()) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
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
