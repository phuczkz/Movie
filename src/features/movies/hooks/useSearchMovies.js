import { useQuery } from "@tanstack/react-query";
import {
  getKKphimByCategory,
  getKKphimByCountry,
  searchKKphim,
  getKKphimByYear,
  isValidCategorySlug,
  isValidCountrySlug,
} from '@/features/movies/api/movies2';
import { comicApi } from '@/features/comics/api/comicApi';
import { filterAdultMovies } from '@/utils/filter';

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

const normalizeText = (text = "") =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const calculateRelevance = (movie, query) => {
  const normQuery = normalizeText(query);
  if (!normQuery) return 0;

  const rawName = (movie.name || "").toLowerCase().trim();
  const rawOrigin = (movie.origin_name || "").toLowerCase().trim();
  const rawQuery = (query || "").toLowerCase().trim();

  const normName = normalizeText(movie.name || "");
  const normOrigin = normalizeText(movie.origin_name || "");

  let score = 0;

  // 1. Exact matches (highest priority)
  if (rawName === rawQuery || normName === normQuery) {
    score += 1000;
  } else if (rawOrigin === rawQuery || normOrigin === normQuery) {
    score += 900;
  }
  // 2. Starts with query (word boundary or full phrase)
  else if (
    normName.startsWith(normQuery + " ") ||
    normName.startsWith(normQuery + ":") ||
    normName.startsWith(normQuery + "-")
  ) {
    score += 600;
  } else if (
    normOrigin.startsWith(normQuery + " ") ||
    normOrigin.startsWith(normQuery + ":") ||
    normOrigin.startsWith(normQuery + "-")
  ) {
    score += 500;
  }
  // 3. Whole phrase boundary match
  else {
    const escapedQuery = normQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordRegex = new RegExp("(^|\\s)" + escapedQuery + "($|\\s)", "i");
    if (wordRegex.test(normName)) {
      score += 350;
    } else if (wordRegex.test(normOrigin)) {
      score += 300;
    }
    // 4. Substring match
    else if (normName.includes(normQuery)) {
      score += 150;
    } else if (normOrigin.includes(normQuery)) {
      score += 100;
    }
  }

  // Small year tiebreaker for recent content
  if (movie.year) {
    const y = Number(movie.year);
    if (!isNaN(y)) {
      score += Math.min(y / 100, 25);
    }
  }

  return score;
};

const dedupeMoviesBySlug = (items = []) => {
  const map = new Map();

  for (const it of items) {
    if (!it) continue;
    const key = it.slug || it._id || it.id;
    if (!key) continue;

    if (map.has(key)) {
      const existing = map.get(key);
      const cur = parseEpisodeCount(it.episode_current);
      const prev = parseEpisodeCount(existing.episode_current);
      if (cur > prev) {
        map.set(key, {
          ...existing,
          ...it,
          episode_current: it.episode_current,
          episode_total: it.episode_total || existing.episode_total,
        });
      }
    } else {
      map.set(key, it);
    }
  }

  return Array.from(map.values());
};

const attachPagination = (list, pagination) => {
  if (Array.isArray(list) && pagination) {
    list.pagination = pagination;
    list.totalPages = pagination.totalPages;
    list.totalItems = pagination.totalItems;
    list.currentPage = pagination.currentPage;
    list.hasNext = pagination.hasNext;
  }
  return list;
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
        const res = await safe(() => comicApi.search(q, page));
        const items = res?.data?.items || [];
        const p = res?.data?.params?.pagination || {};
        const pagination = {
          totalPages: Number(p.totalPages) || 1,
          totalItems: Number(p.totalItems) || items.length,
          currentPage: Number(p.currentPage) || page,
          hasNext: (Number(p.totalPages) || 1) > page,
        };
        const sorted = items.slice().sort((a, b) => calculateRelevance(b, q) - calculateRelevance(a, q));
        return attachPagination(filterAdultMovies(sorted), pagination);
      }

      // Default: Movie search
      const isYear = /^\d{4}$/.test(q);
      const slug = slugify(q);

      const requests = [
        safe(() => searchKKphim(q, page)),
      ];

      if (isValidCategorySlug(slug)) {
        requests.push(safe(() => getKKphimByCategory(slug)));
      }

      if (isValidCountrySlug(slug)) {
        requests.push(safe(() => getKKphimByCountry(slug)));
      }

      if (isYear) {
        requests.push(safe(() => getKKphimByYear(q, page)));
      }

      const results = await Promise.all(requests);

      const searchPrimary = results[0] || [];
      const primaryPagination = searchPrimary.pagination || {
        totalPages: searchPrimary.totalPages || 1,
        totalItems: searchPrimary.totalItems || searchPrimary.length,
        currentPage: page,
        hasNext: (searchPrimary.totalPages || 1) > page,
      };

      const allItems = dedupeMoviesBySlug(results.flat().filter(Boolean));
      const filtered = filterAdultMovies(allItems);

      // Sort by relevance to user query
      const sorted = filtered.sort((a, b) => {
        const scoreDiff = calculateRelevance(b, q) - calculateRelevance(a, q);
        if (scoreDiff !== 0) return scoreDiff;
        return (Number(b.year) || 0) - (Number(a.year) || 0);
      });

      return attachPagination(sorted, primaryPagination);
    },
    enabled: Boolean(query?.trim()),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
