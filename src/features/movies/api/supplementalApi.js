import axios from "axios";
import { filterAdultMovies, isAdultMovie, isForbiddenGenre } from "@/utils/filter";
import { normalizeImageUrl } from "@/utils/image-helper";

// ── Config ──────────────────────────────────────────────────────────────────
// Read API base URL from environment variables; fallback if undefined.
const SECONDARY_API_BASE =
  import.meta.env.VITE_SECONDARY_API || "https://phim.nguonc.com/api";
const SECONDARY_PROVIDER_KEY = "nguon2"; // Internal provider key (no domain name)
const placeholder = "https://placehold.co/600x900/0f172a/94a3b8?text=No+Image";

const decodeHtmlEntities = (str = "") => {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
};

const stripDiacritics = (text = "") =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ── Request cancellation system ─────────────────────────────────────────────
const _secondaryControllers = new Set();

// ── Axios instance ───────────────────────────────────────────────────────────
const secondaryClient = axios.create({
  baseURL: SECONDARY_API_BASE,
  timeout: 8000,
});

secondaryClient.interceptors.request.use((config) => {
  if (!config.signal) {
    const controller = new AbortController();
    config.signal = controller.signal;
    config._abortController = controller;
    _secondaryControllers.add(controller);
  }
  return config;
});

secondaryClient.interceptors.response.use(
  (response) => {
    if (response.config?._abortController) {
      _secondaryControllers.delete(response.config._abortController);
    }
    return response;
  },
  (error) => {
    if (error.config?._abortController) {
      _secondaryControllers.delete(error.config._abortController);
    }
    return Promise.reject(error);
  }
);

export const cancelAllSecondaryRequests = () => {
  _secondaryControllers.forEach((controller) => {
    try {
      controller.abort();
    } catch {
      /* ignore */
    }
  });
  _secondaryControllers.clear();
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const normalizePosterUrl = (url = "") => {
  const trimmed = (url || "").trim();
  if (!trimmed) return placeholder;
  return normalizeImageUrl(trimmed, "https://phim.nguonc.com");
};

/**
 * Normalise server/dub label the same way as the primary API wrapper.
 */
export const normalizeSecondaryServerLabel = (name) => {
  const raw = (name || "").toString().trim();
  const plain = stripDiacritics(raw).toLowerCase();

  if (!raw) return "Vietsub";
  if (plain.includes("subteam")) return "Vietsub";
  if (plain.includes("thuyet") || plain.includes("thuy minh"))
    return "Thuyết Minh";
  if (plain.includes("long") && plain.includes("tieng")) return "Lồng Tiếng";
  if (plain.includes("viet")) return "Vietsub";
  return raw;
};

/**
 * Normalise episode slug so it matches the primary API's slugs.
 */
export const normalizeSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "ep-unknown";

/**
 * Extract a playable m3u8 link from a secondary-API episode object.
 */
export const extractPlayableLink = (ep = {}) => {
  const candidates = [ep.link_m3u8, ep.m3u8, ep.linkplay, ep.link];
  for (const link of candidates) {
    if (!link) continue;
    const l = String(link).trim();
    if (
      l &&
      !l.includes("iframe") &&
      !l.includes("embed") &&
      !l.includes("phimapi.com/player")
    ) {
      return l;
    }
  }
  return "";
};

export const extractEmbedLink = (ep = {}) => {
  const candidates = [ep.link_embed, ep.embed];
  for (const link of candidates) {
    if (!link) continue;
    const l = String(link).trim();
    if (l && (l.includes("embed") || l.includes("iframe") || l.includes("player"))) {
      return l;
    }
  }
  return "";
};

export const normalizeSecondaryMovie = (raw = {}) => {
  if (!raw || typeof raw !== "object") return null;

  const poster_url = normalizePosterUrl(raw.poster_url || raw.thumb_url);
  const thumb_url = normalizePosterUrl(
    raw.thumb_url || raw.poster_url || raw.banner || raw.backdrop_url
  );

  // Categories in NguonC: can be array or object (e.g. { "1": { id, name, slug } })
  let category = [];
  if (Array.isArray(raw.category)) {
    category = raw.category;
  } else if (raw.category && typeof raw.category === "object") {
    category = Object.values(raw.category);
  }

  // Country in NguonC: can be array or object
  let country = [];
  if (Array.isArray(raw.country)) {
    country = raw.country;
  } else if (raw.country && typeof raw.country === "object") {
    country = Object.values(raw.country);
  }

  // Cast / actor in NguonC: can be comma-separated string or array
  let actor = [];
  const rawActor = raw.actor || raw.casts;
  if (Array.isArray(rawActor)) {
    actor = rawActor;
  } else if (typeof rawActor === "string" && rawActor.trim()) {
    actor = rawActor.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Director: can be comma-separated string or array
  let director = [];
  if (Array.isArray(raw.director)) {
    director = raw.director;
  } else if (typeof raw.director === "string" && raw.director.trim()) {
    director = raw.director.split(",").map((s) => s.trim()).filter(Boolean);
  }

  let year = raw.year;
  if (!year && raw.created) {
    const m = String(raw.created).match(/(\d{4})/);
    if (m) year = Number(m[1]);
  }

  const episode_current = raw.current_episode || raw.episode_current || raw.status || "";
  const episode_total = raw.total_episodes ? String(raw.total_episodes) : (raw.episode_total || "");

  return {
    slug: raw.slug || raw._id || raw.id || "unknown",
    name: decodeHtmlEntities(raw.name || raw.title || ""),
    origin_name: decodeHtmlEntities(raw.original_name || raw.origin_name || ""),
    poster_url,
    thumb_url,
    year: year ? Number(year) || year : undefined,
    episode_current,
    episode_total,
    quality: raw.quality || "HD",
    style: raw.style || "",
    lang: raw.language || raw.lang || "Vietsub",
    time: raw.time || "",
    category,
    country,
    content: raw.description || raw.content || "",
    type: raw.type || "",
    status: raw.status || "",
    actor,
    director,
    trailer_url: raw.trailer_url || "",
    tmdb: raw.tmdb || null,
    origin: raw,
    _source: SECONDARY_PROVIDER_KEY,
  };
};

export const extractSecondaryPagination = (data, rawItemsLength = 0, page = 1) => {
  const p = data?.paginate || data?.pagination || data?.data?.params?.pagination;
  const totalPages =
    Number(p?.total_page || p?.totalPages) || (rawItemsLength >= 24 ? page + 1 : page);
  const totalItems = Number(p?.total_items || p?.totalItems) || (rawItemsLength || 0);
  const currentPage = Number(p?.current_page || p?.currentPage) || page;
  const totalItemsPerPage = Number(p?.items_per_page || p?.totalItemsPerPage) || 24;
  return {
    totalPages: Math.max(1, totalPages),
    totalItems,
    currentPage,
    totalItemsPerPage,
    hasNext: totalPages > currentPage,
  };
};

export const attachSecondaryPagination = (list, pagination) => {
  if (Array.isArray(list)) {
    list.pagination = pagination;
    list.totalPages = pagination.totalPages;
    list.totalItems = pagination.totalItems;
    list.currentPage = pagination.currentPage;
    list.hasNext = pagination.hasNext;
  }
  return list;
};

const uniqueBySlug = (items = []) => {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item?.slug || item?._id || item?.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

// ── Public List Functions ───────────────────────────────────────────────────

export const fetchSecondaryList = async (path, page = 1, extraParams = {}) => {
  if (extraParams.category && isForbiddenGenre(extraParams.category)) {
    return attachSecondaryPagination([], extractSecondaryPagination(null, 0, page));
  }
  try {
    const { data } = await secondaryClient.get(path, {
      params: { page, ...extraParams },
    });
    const items = data?.items || data?.data?.items || [];
    const pagination = extractSecondaryPagination(data, items.length, page);
    const filtered = filterAdultMovies(
      uniqueBySlug(items)
        .map(normalizeSecondaryMovie)
        .filter(Boolean)
    );
    return attachSecondaryPagination(filtered, pagination);
  } catch (error) {
    if (
      error?.response?.status !== 404 &&
      error?.code !== "ERR_CANCELED" &&
      error?.name !== "CanceledError" &&
      error?.name !== "AbortError"
    ) {
      console.warn(`[secondaryApi] ${path} failed:`, error?.message);
    }
    return attachSecondaryPagination([], extractSecondaryPagination(null, 0, page));
  }
};

export const getSecondaryLatest = (page = 1, extraParams = {}) =>
  fetchSecondaryList("/films/phim-moi-cap-nhat", page, extraParams);

export const getSecondarySeries = (page = 1, extraParams = {}) =>
  fetchSecondaryList("/films/danh-sach/phim-bo", page, extraParams);

export const getSecondarySingle = (page = 1, extraParams = {}) =>
  fetchSecondaryList("/films/danh-sach/phim-le", page, extraParams);

export const getSecondaryDangChieu = (page = 1, extraParams = {}) =>
  fetchSecondaryList("/films/danh-sach/phim-dang-chieu", page, extraParams);

export const getSecondaryHoatHinh = (page = 1, extraParams = {}) =>
  fetchSecondaryList("/films/danh-sach/hoat-hinh", page, extraParams);

export const getSecondaryByCategory = async (slug, page = 1, extraParams = {}) => {
  if (!slug || isForbiddenGenre(slug)) {
    return attachSecondaryPagination([], extractSecondaryPagination(null, 0, page));
  }
  const primaryRes = await fetchSecondaryList(`/films/the-loai/${slug}`, page, extraParams);
  if (primaryRes.length > 0 || (primaryRes.totalItems && primaryRes.totalItems > 0)) {
    return primaryRes;
  }
  return fetchSecondaryList(`/films/danh-sach/${slug}`, page, extraParams);
};

export const getSecondaryByCountry = (slug, page = 1, extraParams = {}) =>
  fetchSecondaryList(`/films/quoc-gia/${slug}`, page, extraParams);

export const getSecondaryByYear = (year, page = 1) =>
  fetchSecondaryList(`/films/nam-phat-hanh/${year}`, page);

/**
 * Search the secondary API by keyword and return normalized items with pagination.
 * @param {string} keyword
 * @param {number} [page=1]
 * @returns {Promise<Array>}
 */
export const searchSecondaryApi = async (keyword, page = 1) => {
  const cleanKeyword = (keyword || "").toString().trim();
  if (!cleanKeyword) return attachSecondaryPagination([], extractSecondaryPagination(null, 0, page));
  try {
    const { data } = await secondaryClient.get("/films/search", {
      params: { keyword: cleanKeyword, page },
    });
    const items = data?.items || data?.data?.items || [];
    const pagination = extractSecondaryPagination(data, items.length, page);
    const filtered = filterAdultMovies(
      uniqueBySlug(items)
        .map(normalizeSecondaryMovie)
        .filter(Boolean)
    );
    return attachSecondaryPagination(filtered, pagination);
  } catch {
    return attachSecondaryPagination([], extractSecondaryPagination(null, 0, page));
  }
};

/**
 * Fetch movie detail and episodes from the secondary API by slug.
 * Returns normalized movie metadata and episodes tagged with `_provider: SECONDARY_PROVIDER_KEY`.
 *
 * @param {string} slug – movie slug
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ movie: object|null, episodes: Array } | null>}
 */
export const getSecondaryDetail = async (slug, options = {}) => {
  if (!slug) return null;
  try {
    const { data } = await secondaryClient.get(`/film/${slug}`, {
      signal: options.signal,
    });

    const movieData = data?.movie || data?.data?.movie || data?.data || data;
    const rawEpisodes = movieData?.episodes || data?.episodes || [];

    const movie = movieData ? normalizeSecondaryMovie(movieData) : null;
    if (movie && isAdultMovie(movie)) {
      return { movie: null, episodes: [] };
    }

    if (!Array.isArray(rawEpisodes) || !rawEpisodes.length) {
      return movie ? { movie, episodes: [] } : null;
    }

    const episodes = rawEpisodes.flatMap((server) => {
      const serverName = server?.server_name || server?.name || "";
      const normalizedLabel = normalizeSecondaryServerLabel(serverName);
      const list = server?.items || server?.server_data || [];

      if (!Array.isArray(list)) return [];

      return list
        .filter((ep) => {
          if (!ep || typeof ep !== "object") return false;
          const hasName = Boolean(ep.name && String(ep.name).trim());
          const hasSlug = Boolean(ep.slug && String(ep.slug).trim());
          const hasLink = Boolean(
            (ep.link_m3u8 && String(ep.link_m3u8).trim()) ||
              (ep.m3u8 && String(ep.m3u8).trim()) ||
              (ep.link_embed && String(ep.link_embed).trim()) ||
              (ep.embed && String(ep.embed).trim()) ||
              (ep.linkplay && String(ep.linkplay).trim()) ||
              (ep.link && String(ep.link).trim())
          );
          return (hasName || hasSlug) && hasLink;
        })
        .map((ep) => {
          const epSlug = ep.slug
            ? normalizeSlug(ep.slug)
            : normalizeSlug(ep.name || "");
          const playLink = extractPlayableLink(ep);
          const embedLink = extractEmbedLink(ep);
          const effectiveLink = playLink || embedLink;

          const providers = {};
          if (playLink) {
            providers[SECONDARY_PROVIDER_KEY] = { link: playLink, kind: "m3u8" };
          } else if (embedLink) {
            providers[SECONDARY_PROVIDER_KEY] = { link: embedLink, kind: "embed" };
          }
          if (embedLink) {
            providers["backup"] = { link: embedLink, kind: "embed" };
          }

          return {
            name: ep.name || `Tập ${epSlug}`,
            slug: epSlug,
            server_name: normalizedLabel,
            link_m3u8: playLink,
            link_embed: embedLink,
            link: effectiveLink,
            _provider: SECONDARY_PROVIDER_KEY,
            _preferredProvider: SECONDARY_PROVIDER_KEY,
            _providers: providers,
          };
        });
    });

    return { movie, episodes };
  } catch {
    return null;
  }
};

/**
 * Attempt to resolve secondary API episodes for a given movie.
 * Strategy:
 *   1. Try the primary slug directly.
 *   2. Fall back to a keyword search using movieName or originName.
 *
 * @param {string} primarySlug
 * @param {string} [movieName]
 * @param {string} [originName]
 * @param {number|string} [year]
 * @returns {Promise<{ movie?: object, episodes: Array } | null>}
 */
export const getSecondaryEpisodes = async (
  primarySlug,
  movieName,
  originName,
  year
) => {
  if (!primarySlug) return null;

  // 1. Try with the exact same slug
  const direct = await getSecondaryDetail(primarySlug);
  if (direct && direct.episodes?.length) return direct;

  // 2. Search by name
  const queries = [movieName, originName].filter(Boolean);
  for (const q of queries) {
    const hits = await searchSecondaryApi(q);
    if (!hits?.length) continue;

    const normalized = (t) => (t || "").toLowerCase().trim();
    const namesToMatch = [movieName, originName].map(normalized).filter(Boolean);

    const best = hits.find((m) => {
      const nameHit =
        namesToMatch.includes(normalized(m.name)) ||
        namesToMatch.includes(normalized(m.origin_name)) ||
        namesToMatch.includes(normalized(m.original_name));
      const mYear = m.year || m.publishYear || m.released;
      const yearHit =
        year && mYear ? String(mYear) === String(year) : true;
      return nameHit && yearHit;
    });

    if (best?.slug) {
      const result = await getSecondaryDetail(best.slug);
      if (result?.episodes?.length) return result;
    }
  }

  return null;
};

export { SECONDARY_PROVIDER_KEY };
