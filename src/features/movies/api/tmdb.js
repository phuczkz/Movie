import axios from "axios";
import { filterAdultMovies, isAdultMovie } from '@/utils/filter';
import { parseSeasonInfo } from '@/utils/episodes';

// Using the Proxy URL to keep the API Key secret on the server
const baseURL = import.meta.env.VITE_TMDB_PROXY;
const posterBase = import.meta.env.VITE_TMDB_IMAGE_BASE;
const backdropBase = import.meta.env.VITE_TMDB_BACKDROP_BASE;
const profileBase = import.meta.env.VITE_TMDB_PROFILE_BASE;

const placeholder = "https://placehold.co/600x900/0f172a/94a3b8?text=No+Image";

const tmdb = axios.create({
  baseURL,
  timeout: 10000,
});

tmdb.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.status_message ||
      error?.response?.data?.message ||
      error.message ||
      "TMDB request failed";
    return Promise.reject(new Error(message));
  }
);

const buildImage = (path, base) => {
  if (!path) return placeholder;
  return `${base}${path}`;
};

const normalizeTmdbMovie = (raw = {}, mediaType = "movie") => {
  const slug = raw.id ? `tmdb-${mediaType}-${raw.id}` : "tmdb-unknown";
  const poster_url = buildImage(raw.poster_path, posterBase);
  const thumb_url = buildImage(
    raw.backdrop_path || raw.backdrop || raw.still_path,
    backdropBase
  );

  const year = raw.release_date || raw.first_air_date || "";
  const runtime = raw.runtime || (raw.episode_run_time?.[0] ?? null);

  let status = raw.status || "";
  let isTrailer = false;
  if (
    ["Planned", "Upcoming", "In Production", "Rumored"].includes(raw.status)
  ) {
    status = "Trailer";
    isTrailer = true;
  } else if (status === "Released" || status === "Ended") {
    status = "Full";
  } else if (status === "Returning Series") {
    status = "Tập mới";
  }

  return {
    slug,
    name: raw.title || raw.name || null,
    poster_url,
    thumb_url,
    backdrop_url: thumb_url,
    year: year ? year.slice(0, 4) : undefined,
    episode_current: status,
    episode_total:
      raw.number_of_episodes ||
      (isTrailer ? "?" : raw.status === "Released" ? "1" : ""),
    quality: isTrailer ? "Trailer" : "HD",
    lang: isTrailer ? "Trailer" : "",
    time: runtime ? `${runtime} phút` : undefined,
    category: raw.genres?.map((g) => g.name) || raw.genre_ids || [],
    content: raw.overview,
    rating: raw.vote_average,
    origin_source: "tmdb",
    origin_type: mediaType,
    origin: raw,
  };
};

const fetchTmdbDetail = async (id) => {
  const params = { append_to_response: "credits" };

  let detail = null;
  let mediaType = "movie";

  try {
    const res = await tmdb.get(`movie/${id}`, { params });
    detail = res.data;
  } catch {
    // Fallback to TV if movie lookup fails
  }

  if (!detail) {
    const res = await tmdb.get(`tv/${id}`, { params });
    detail = res.data;
    mediaType = "tv";
  }

  return { detail, mediaType };
};

export const getPopular = async (page = 1) => {
  const { data } = await tmdb.get("movie/popular", {
    params: { page },
  });
  return filterAdultMovies(data?.results?.map(normalizeTmdbMovie) || []);
};

export const getTmdbDetailBySlug = async (slug) => {
  const parts = slug.split("-");
  const id = parts[parts.length - 1];
  let mediaType = parts[parts.length - 2];

  let detail = null;

  // If mediaType is missing or invalid in slug, use the fallback trial-and-error fetch
  if (mediaType !== "movie" && mediaType !== "tv") {
    const result = await fetchTmdbDetail(id);
    detail = result.detail;
    mediaType = result.mediaType;
  } else {
    // Direct fetch using the known media type from the slug
    try {
      const params = { append_to_response: "credits" };
      const res = await tmdb.get(`${mediaType}/${id}`, { params });
      detail = res.data;
    } catch (err) {
      console.warn(
        `[tmdb] direct fetch failed for ${mediaType}/${id}`,
        err.message
      );
      // Last resort fallback
      const result = await fetchTmdbDetail(id);
      detail = result.detail;
      mediaType = result.mediaType;
    }
  }

  if (!detail) return { movie: null, episodes: [] };

  const movie = normalizeTmdbMovie(detail, mediaType);

  if (isAdultMovie(movie)) {
    return { movie: null, episodes: [] };
  }

  const cast = detail?.credits?.cast || [];
  const actors = cast.slice(0, 20).map((c) => ({
    id: c.id,
    name: c.name || c.original_name || "",
    image: c.profile_path ? buildImage(c.profile_path, profileBase) : null,
    character: c.character,
  }));

  if (actors.length) movie.actor = actors;

  // Include season info for TV shows
  if (mediaType === "tv") {
    movie.seasons = detail.seasons || [];
  }

  return { movie, episodes: [] };
};
/**
 * Map KKphim country slugs to TMDB original_language codes.
 * Used to disambiguate movies with the same name from different countries.
 */
const COUNTRY_SLUG_TO_LANG = {
  "thai-lan": "th",
  "han-quoc": "ko",
  "trung-quoc": "zh",
  "nhat-ban": "ja",
  "an-do": "hi",
  "dai-loan": "zh",
  "hong-kong": "cn",
  "phap": "fr",
  "duc": "de",
  "tay-ban-nha": "es",
  "y": "it",
  "brazil": "pt",
  "bo-dao-nha": "pt",
  "nga": "ru",
  "viet-nam": "vi",
  "philippines": "tl",
  "indonesia": "id",
  "my": "en",
  "anh": "en",
  "uc": "en",
  "canada": "en",
};

/**
 * Map KKphim movie types to preferred TMDB media_type.
 */
const mapMovieType = (type) => {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t === "single" || t === "phimle") return "movie";
  if (t === "series" || t === "phimbo" || t === "hoathinh" || t === "tvshows") return "tv";
  return null;
};

const cleanTitle = (str = "") =>
  (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

/**
 * Calculates match score between a search query and a TMDB candidate.
 * Returns a value from 0 to 100.
 * A score of 0 means the candidate has NO textual similarity to the query.
 */
const calculateTitleMatch = (query, candidate) => {
  const q = cleanTitle(query);
  if (!q) return 0;
  const qTokens = q.split(" ").filter((t) => t.length > 1);

  const candidateTitles = [
    candidate.title,
    candidate.name,
    candidate.original_title,
    candidate.original_name,
  ]
    .filter(Boolean)
    .map(cleanTitle);

  let best = 0;
  for (const t of candidateTitles) {
    if (!t) continue;
    // Exact match
    if (t === q) return 100;
    // Substring match
    if (t.includes(q) || q.includes(t)) {
      const ratio = Math.min(t.length, q.length) / Math.max(t.length, q.length);
      best = Math.max(best, Math.round(50 + ratio * 40));
      continue;
    }
    // Token overlap match
    if (qTokens.length > 0) {
      const tTokens = new Set(t.split(" ").filter((x) => x.length > 1));
      const overlap = qTokens.filter((tok) => tTokens.has(tok)).length;
      const ratio = overlap / qTokens.length;
      if (ratio > 0) {
        best = Math.max(best, Math.round(ratio * 50));
      }
    }
  }
  return best;
};

// In-memory cache và khử trùng lặp request tìm kiếm TMDB đang thực hiện
const searchCache = new Map();
const inFlightSearches = new Map();

/**
 * Search TMDB for a movie/TV show, with optional context for disambiguation.
 * @param {string} query - Search query
 * @param {number|string} [year] - Release year
 * @param {object} [context] - Additional context for scoring
 * @param {string} [context.countrySlug] - KKphim country slug (e.g. "thai-lan")
 * @param {string} [context.type] - KKphim movie type (e.g. "series", "single")
 */
export const searchTmdbMovie = async (query, year, context = {}) => {
  if (!query) return null;

  const cacheKey = `${query.toString().trim().toLowerCase()}_${year || ""}_${context.countrySlug || ""}_${context.type || ""}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  if (inFlightSearches.has(cacheKey)) {
    return inFlightSearches.get(cacheKey);
  }

  const searchPromise = (async () => {
    try {
      const { data } = await tmdb.get("search/multi", {
        params: { query, year },
      });
    const results = data?.results || [];
    // Only consider movie/tv results that have a backdrop or poster
    const candidates = results.filter(
      (r) =>
        (r.media_type === "movie" || r.media_type === "tv") &&
        (r.poster_path || r.backdrop_path)
    );

    if (!candidates.length) return null;

    const { countrySlug, type } = context;
    const expectedLang = countrySlug ? COUNTRY_SLUG_TO_LANG[countrySlug] : null;
    const expectedMediaType = mapMovieType(type);
    const yearNum = year ? Number(year) : null;

    let bestScore = -Infinity;
    let bestCandidate = null;

    for (const r of candidates) {
      // 1. Mandatory title similarity verification to avoid matching unrelated titles
      const titleScore = calculateTitleMatch(query, r);
      if (titleScore === 0) {
        // Disqualify candidate entirely if title has zero similarity with query
        continue;
      }

      let score = titleScore;

      // Year match: strong signal (±1 year tolerance)
      const rYear = (r.release_date || r.first_air_date || "").slice(0, 4);
      if (yearNum && rYear) {
        const diff = Math.abs(Number(rYear) - yearNum);
        if (diff === 0) score += 30;
        else if (diff === 1) score += 15;
        else if (diff <= 2) score += 5;
        // Penalize very old results when searching for recent content
        else if (diff > 10) score -= 20;
        else score -= 5;
      }

      // Original language match: strongest disambiguation signal
      if (expectedLang && r.original_language) {
        if (r.original_language === expectedLang) {
          score += 40;
        } else {
          // Mild penalty for wrong language — not a dealbreaker
          score -= 5;
        }
      }

      // Media type match: series vs movie
      if (expectedMediaType && r.media_type) {
        if (r.media_type === expectedMediaType) {
          score += 20;
        } else {
          score -= 10;
        }
      }

      // Slight boost for popularity (tiebreaker) — normalized to small range
      score += Math.min((r.popularity || 0) / 100, 5);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = r;
      }
    }

      searchCache.set(cacheKey, bestCandidate);
      return bestCandidate;
    } catch (error) {
      console.warn("[tmdb] search failed", error.message);
      return null;
    } finally {
      inFlightSearches.delete(cacheKey);
    }
  })();

  inFlightSearches.set(cacheKey, searchPromise);
  return searchPromise;
};

export const getTmdbCredits = async (id, mediaType = "movie") => {
  if (!id) return [];
  try {
    const { data } = await tmdb.get(`${mediaType}/${id}/credits`);
    const cast = data?.cast || [];
    return cast.slice(0, 20).map((c) => ({
      id: c.id,
      name: c.name || c.original_name || "",
      image: c.profile_path ? buildImage(c.profile_path, profileBase) : null,
      character: c.character,
    }));
  } catch (error) {
    console.warn("[tmdb] credits failed", error.message);
    return [];
  }
};
export const searchTmdbPerson = async (query) => {
  if (!query) return null;
  try {
    const { data } = await tmdb.get("search/person", {
      params: { query },
    });
    return data?.results?.[0] || null;
  } catch (error) {
    console.warn("[tmdb] person search failed", error.message);
    return null;
  }
};

export const getTmdbPersonCredits = async (personId) => {
  if (!personId) return [];
  try {
    const { data } = await tmdb.get(`person/${personId}/combined_credits`);
    const cast = data?.cast || [];
    // Filter and normalize
    const normalized = cast
      .filter((c) => c.poster_path || c.backdrop_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 40)
      .map((c) => normalizeTmdbMovie(c, c.media_type));

    const filtered = filterAdultMovies(normalized);

    // Deduplicate by slug
    const seen = new Set();
    return filtered.filter((m) => {
      if (seen.has(m.slug)) return false;
      seen.add(m.slug);
      return true;
    });
  } catch (error) {
    console.warn("[tmdb] person credits failed", error.message);
    return [];
  }
};
export const getTmdbPersonDetail = async (personId) => {
  if (!personId) return null;
  try {
    const { data } = await tmdb.get(`person/${personId}`);
    return {
      id: data.id,
      name: data.name,
      biography: data.biography,
      birthday: data.birthday,
      place_of_birth: data.place_of_birth,
      profile_path: data.profile_path
        ? buildImage(data.profile_path, profileBase)
        : null,
    };
  } catch (error) {
    console.warn("[tmdb] person detail failed", error.message);
    return null;
  }
};

export const getTmdbFullEpisodes = async (
  id,
  mediaType = "tv",
  seasons = []
) => {
  if (!id || mediaType !== "tv") return [];
  try {
    let seasonList = Array.isArray(seasons) ? seasons : [];

    // For non-TMDB primary sources, seasons may be missing: resolve from TV detail first.
    if (!seasonList.length) {
      const { data: tvDetail } = await tmdb.get(`tv/${id}`);
      seasonList = tvDetail?.seasons || [];
    }

    const targetSeasons = seasonList
      .filter((s) => Number.isFinite(Number(s?.season_number)))
      .slice(-2);

    if (!targetSeasons.length) return [];

    // To keep it simple and avoid too many requests, fetch only the latest seasons.
    const seasonResults = await Promise.all(
      targetSeasons.map(async (s) => {
        const { data } = await tmdb.get(`tv/${id}/season/${s.season_number}`);
        return data.episodes || [];
      })
    );
    return seasonResults.flat();
  } catch (error) {
    console.warn("[tmdb] full episodes failed", error.message);
    return [];
  }
};

/**
 * Search TMDB for a movie/TV by name (and optional year) and return its logo image URL.
 * Prioritizes direct lookup by tmdbId if provided in context.
 * Tries `originName` candidates and `name`.
 * Returns null if no logo is found.
 * @param {string} name - Vietnamese name
 * @param {string} originName - Original name
 * @param {number|string} year - Release year
 * @param {object} [context] - { countrySlug, type, tmdbId, tmdbType } for disambiguation and direct ID lookup
 */
export const getTmdbLogo = async (name, originName, year, context = {}) => {
  const { tmdbId, tmdbType, type } = context;

  // 1. Direct lookup by TMDB ID if available from the movie source
  if (tmdbId) {
    try {
      const preferredType = tmdbType || mapMovieType(type) || "tv";
      let res = null;
      try {
        res = await tmdb.get(`${preferredType}/${tmdbId}/images`, {
          params: { include_image_language: "vi,en,null" },
        });
      } catch {
        const altType = preferredType === "tv" ? "movie" : "tv";
        res = await tmdb.get(`${altType}/${tmdbId}/images`, {
          params: { include_image_language: "vi,en,null" },
        });
      }

      const logos = res?.data?.logos || [];
      if (logos.length) {
        const pick =
          logos.find((l) => l.iso_639_1 === "vi") ||
          logos.find((l) => l.iso_639_1 === "en") ||
          logos.find((l) => !l.iso_639_1) ||
          logos[0];

        if (pick?.file_path) {
          return {
            url: `https://image.tmdb.org/t/p/original${pick.file_path}`,
            lang: pick.iso_639_1 || "other",
          };
        }
      }
    } catch (error) {
      console.warn(`[tmdb] direct logo lookup for id ${tmdbId} failed`, error.message);
    }
  }

  if (!name && !originName) return null;

  // Clean the names (e.g. "Movie Name (Phần 2)" -> "Movie Name")
  const { baseName: cleanName } = parseSeasonInfo(name || "");
  const { baseName: cleanOrigin } = parseSeasonInfo(originName || "");

  // Split multi-name origins like "City Rong / Rong Cheng"
  const originCandidates = cleanOrigin
    ? cleanOrigin
        .split(/[/,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  try {
    let match = null;
    const isForeign = context.countrySlug && context.countrySlug !== "viet-nam";

    // For foreign films, try original titles first because TMDB indexes them more accurately
    const queriesToTry = isForeign
      ? [...originCandidates, cleanName].filter(Boolean)
      : [cleanName, ...originCandidates].filter(Boolean);

    for (const q of queriesToTry) {
      match = await searchTmdbMovie(q, year, context);
      if (!match) match = await searchTmdbMovie(q, undefined, context);
      if (match) break;
    }

    if (!match) return null;

    const mediaType = match.media_type || "movie";
    const id = match.id;

    const { data } = await tmdb.get(`${mediaType}/${id}/images`, {
      params: { include_image_language: "vi,en,null" },
    });

    const logos = data?.logos || [];
    if (!logos.length) return null;

    // Priority: vi → en → no-language (null/"") → any (zh, ja, etc.)
    const pick =
      logos.find((l) => l.iso_639_1 === "vi") ||
      logos.find((l) => l.iso_639_1 === "en") ||
      logos.find((l) => !l.iso_639_1) ||
      logos[0];

    if (!pick?.file_path) return null;

    return {
      url: `https://image.tmdb.org/t/p/original${pick.file_path}`,
      lang: pick.iso_639_1 || "other",
    };
  } catch (error) {
    console.warn("[tmdb] logo fetch failed", error.message);
    return null;
  }
};

/**
 * Search TMDB for a movie/TV and return its high-res backdrop image URL.
 * Prioritizes direct lookup by tmdbId if provided in context.
 * @param {string} name - Vietnamese name
 * @param {string} originName - Original name
 * @param {number|string} year - Release year
 * @param {object} [context] - { countrySlug, type, tmdbId, tmdbType } for disambiguation and direct ID lookup
 */
export const getTmdbBackdrop = async (name, originName, year, context = {}) => {
  const { tmdbId, tmdbType, type } = context;

  // 1. Direct lookup by TMDB ID if available from the movie source
  if (tmdbId) {
    try {
      const preferredType = tmdbType || mapMovieType(type) || "tv";
      let backdropPath = null;
      try {
        const res = await tmdb.get(`${preferredType}/${tmdbId}`);
        backdropPath = res?.data?.backdrop_path || null;
      } catch {
        const altType = preferredType === "tv" ? "movie" : "tv";
        const altRes = await tmdb.get(`${altType}/${tmdbId}`);
        backdropPath = altRes?.data?.backdrop_path || null;
      }

      if (backdropPath) {
        return `https://image.tmdb.org/t/p/original${backdropPath}`;
      }
    } catch (error) {
      console.warn(`[tmdb] direct backdrop lookup for id ${tmdbId} failed`, error.message);
    }
  }

  if (!name && !originName) return null;

  const { baseName: cleanName } = parseSeasonInfo(name || "");
  const { baseName: cleanOrigin } = parseSeasonInfo(originName || "");

  // Split multi-name origins like "City Rong / Rong Cheng"
  const originCandidates = cleanOrigin
    ? cleanOrigin
        .split(/[/,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  try {
    let match = null;
    const isForeign = context.countrySlug && context.countrySlug !== "viet-nam";

    const queriesToTry = isForeign
      ? [...originCandidates, cleanName].filter(Boolean)
      : [cleanName, ...originCandidates].filter(Boolean);

    for (const q of queriesToTry) {
      match = await searchTmdbMovie(q, year, context);
      if (!match) match = await searchTmdbMovie(q, undefined, context);
      if (match) break;
    }

    if (!match || !match.backdrop_path) return null;

    return `https://image.tmdb.org/t/p/original${match.backdrop_path}`;
  } catch (error) {
    console.warn("[tmdb] backdrop fetch failed", error.message);
    return null;
  }
};

/**
 * Lấy đồng thời cả Logo và Backdrop cho Hero carousel trong 1 lần tìm kiếm duy nhất,
 * tránh việc gọi 2 hàm getTmdbLogo và getTmdbBackdrop tìm kiếm lặp lại cùng một phim.
 */
export const getTmdbHeroAssets = async (name, originName, year, context = {}) => {
  const { tmdbId, tmdbType, type } = context;

  // 1. Nếu có tmdbId trực tiếp
  if (tmdbId) {
    try {
      const preferredType = tmdbType || mapMovieType(type) || "tv";
      let res = null;
      try {
        res = await tmdb.get(`${preferredType}/${tmdbId}`, {
          params: { append_to_response: "images", include_image_language: "vi,en,null" },
        });
      } catch {
        const altType = preferredType === "tv" ? "movie" : "tv";
        res = await tmdb.get(`${altType}/${tmdbId}`, {
          params: { append_to_response: "images", include_image_language: "vi,en,null" },
        });
      }

      if (res?.data) {
        const backdrop = res.data.backdrop_path
          ? `https://image.tmdb.org/t/p/original${res.data.backdrop_path}`
          : null;
        const logos = res.data.images?.logos || [];
        let logo = null;
        if (logos.length) {
          const pick =
            logos.find((l) => l.iso_639_1 === "vi") ||
            logos.find((l) => l.iso_639_1 === "en") ||
            logos.find((l) => !l.iso_639_1) ||
            logos[0];
          if (pick?.file_path) {
            logo = {
              url: `https://image.tmdb.org/t/p/original${pick.file_path}`,
              lang: pick.iso_639_1 || "other",
            };
          }
        }
        return { logo, backdrop };
      }
    } catch (e) {
      console.warn(`[tmdb] direct hero assets lookup for id ${tmdbId} failed`, e.message);
    }
  }

  // 2. Tìm kiếm qua tên
  if (!name && !originName) return { logo: null, backdrop: null };

  const { baseName: cleanName } = parseSeasonInfo(name || "");
  const { baseName: cleanOrigin } = parseSeasonInfo(originName || "");
  const originCandidates = cleanOrigin
    ? cleanOrigin
        .split(/[/,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const isForeign = context.countrySlug && context.countrySlug !== "viet-nam";
  const queriesToTry = isForeign
    ? [...originCandidates, cleanName].filter(Boolean)
    : [cleanName, ...originCandidates].filter(Boolean);

  let match = null;
  for (const q of queriesToTry) {
    match = await searchTmdbMovie(q, year, context);
    if (!match) match = await searchTmdbMovie(q, undefined, context);
    if (match) break;
  }

  if (!match) return { logo: null, backdrop: null };

  const backdrop = match.backdrop_path
    ? `https://image.tmdb.org/t/p/original${match.backdrop_path}`
    : null;

  const mediaType = match.media_type || "movie";
  const id = match.id;

  let logo = null;
  try {
    const { data } = await tmdb.get(`${mediaType}/${id}/images`, {
      params: { include_image_language: "vi,en,null" },
    });
    const logos = data?.logos || [];
    if (logos.length) {
      const pick =
        logos.find((l) => l.iso_639_1 === "vi") ||
        logos.find((l) => l.iso_639_1 === "en") ||
        logos.find((l) => !l.iso_639_1) ||
        logos[0];
      if (pick?.file_path) {
        logo = {
          url: `https://image.tmdb.org/t/p/original${pick.file_path}`,
          lang: pick.iso_639_1 || "other",
        };
      }
    }
  } catch (err) {
    console.warn("[tmdb] hero logo fetch failed", err.message);
  }

  return { logo, backdrop };
};

