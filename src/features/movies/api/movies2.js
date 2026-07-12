import axios from "axios";
import { filterAdultMovies, isAdultMovie } from '@/utils/filter';

// Helpers to escape and decode HTML entities for search queries and display names
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

const escapeHtmlSearch = (str = "") => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#039;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const apiBase = import.meta.env.VITE_KKPHIM_API;
const imageCdn = (import.meta.env.VITE_KKPHIM_IMAGE_CDN || "").replace(
  /\/$/,
  ""
);
const proxyUrl = import.meta.env.VITE_STREAM_PROXY;
const placeholder = "https://placehold.co/600x900/0f172a/94a3b8?text=No+Image";

// ── Request cancellation system (mirrors client.js) ──
let _pendingControllers = new Set();

const kkphim = axios.create({
  baseURL: apiBase,
  timeout: 8000,
});

// Auto-attach AbortController to every request
kkphim.interceptors.request.use((config) => {
  if (!config.signal) {
    const controller = new AbortController();
    config.signal = controller.signal;
    config._abortController = controller;
    _pendingControllers.add(controller);
  }

  if (proxyUrl) {
    let fullUrl = config.url;
    if (!fullUrl.startsWith("http")) {
      const base = config.baseURL || "";
      fullUrl = `${base.replace(/\/$/, "")}/${fullUrl.replace(/^\//, "")}`;
    }
    if (config.params) {
      const urlObj = new URL(fullUrl);
      Object.keys(config.params).forEach((key) => {
        if (config.params[key] !== undefined && config.params[key] !== null) {
          urlObj.searchParams.append(key, config.params[key]);
        }
      });
      fullUrl = urlObj.toString();
      config.params = {}; 
    }
    config.baseURL = "";
    config.url = `${proxyUrl.replace(/\/$/, "")}/?url=${encodeURIComponent(fullUrl)}`;
  }

  return config;
});

kkphim.interceptors.response.use(
  (response) => {
    if (response.config._abortController) {
      _pendingControllers.delete(response.config._abortController);
    }
    
    // Patch image paths for KKPhim Format 2 API which omits the date folder in poster_url
    const data = response.data;
    if (data?.data?.items && data?.data?.seoOnPage?.og_image) {
      const items = data.data.items;
      const ogImages = Array.isArray(data.data.seoOnPage.og_image) ? data.data.seoOnPage.og_image : [];
      const cdn = data.data.APP_DOMAIN_CDN_IMAGE || "https://img.phimapi.com";
      
      items.forEach((item) => {
        if (!item.poster_url || item.poster_url.startsWith("http")) return;
        
        const p_file = item.poster_url.split('/').pop();
        const t_file = (item.thumb_url || '').split('/').pop();
        
        const p_full = ogImages.find(img => typeof img === "string" && img.endsWith('/' + p_file));
        if (p_full) {
           item.poster_url = `${cdn}/${p_full}`;
           if (t_file) {
             const folder = p_full.substring(0, p_full.lastIndexOf('/'));
             item.thumb_url = `${cdn}/${folder}/${t_file}`;
           }
        }
      });
    }

    return response;
  },
  (error) => {
    if (error.config?._abortController) {
      _pendingControllers.delete(error.config._abortController);
    }
    if (axios.isCancel(error) || error.name === "CanceledError" || error.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }
    const message =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error.message ||
      "KKphim request failed";
    return Promise.reject(new Error(message));
  }
);

/**
 * Cancel all pending KKphim API requests.
 */
export const cancelAllKKphimRequests = () => {
  _pendingControllers.forEach((controller) => {
    try { controller.abort(); } catch { /* ignore */ }
  });
  _pendingControllers.clear();
};

const normalizePosterUrl = (url = "") => {
  const trimmed = (url || "").trim();
  if (!trimmed) return placeholder;
  if (trimmed.startsWith("http")) return trimmed;
  const clean = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${imageCdn}${clean}`;
};

const normalizeKKphimMovie = (raw = {}) => {
  const poster_url = normalizePosterUrl(raw.poster_url || raw.thumb_url);
  const thumb_url = normalizePosterUrl(
    raw.banner || raw.backdrop_url || raw.thumb_url || raw.poster_url
  );

  return {
    slug: raw.slug || raw._id || raw.id || "unknown",
    name: decodeHtmlEntities(raw.name || raw.title || null),
    origin_name: decodeHtmlEntities(raw.origin_name || ""),
    poster_url,
    thumb_url,
    year: raw.year,
    episode_current: raw.episode_current || raw.status || "",
    episode_total: raw.episode_total || "",
    quality: raw.quality || "",
    style: raw.style || "",
    lang: raw.lang || "",
    time: raw.time || "",
    category: raw.category || [],
    country: raw.country || [],
    content: raw.content || "",
    type: raw.type || "",
    status: raw.status || "",
    actor: raw.actor || [],
    director: raw.director || [],
    trailer_url: raw.trailer_url || "",
    origin: raw,
  };
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

const fetchList = async (path, page = 1, extraParams = {}) => {
  const config = { params: { page, ...extraParams } };
  if (path === "/danh-sach/phim-moi-cap-nhat") {
    // This endpoint is hosted directly under the API base URL without the /v1/api prefix
    config.baseURL = import.meta.env.VITE_KKPHIM_API_BASE;
  }
  const { data } = await kkphim.get(path, config);
  const items = data?.data?.items || data?.items || [];
  return filterAdultMovies(uniqueBySlug(items).map(normalizeKKphimMovie));
};

export const getKKphimLatest = (page = 1, extraParams = {}) =>
  fetchList("/danh-sach/phim-moi-cap-nhat", page, extraParams);
export const getKKphimSeries = (page = 1, extraParams = {}) =>
  fetchList("/danh-sach/phim-bo", page, extraParams);
export const getKKphimSingle = (page = 1, extraParams = {}) =>
  fetchList("/danh-sach/phim-le", page, extraParams);
export const getKKphimChieuRap = (page = 1, extraParams = {}) =>
  fetchList("/danh-sach/phim-chieu-rap", page, extraParams);
export const getKKphimHoatHinh = (page = 1, extraParams = {}) =>
  fetchList("/danh-sach/hoat-hinh", page, extraParams);

export const getKKphimDetail = async (slug, options = {}) => {
  const { data } = await kkphim.get(`/phim/${slug}`, {
    signal: options.signal,
  });
  const movieData = data?.data?.item || data?.item || data?.movie || data;
  const movie = normalizeKKphimMovie(movieData);

  if (isAdultMovie(movie)) {
    return { movie: null, episodes: [] };
  }

  const episodesData = movieData?.episodes || [];
  const episodes = Array.isArray(episodesData)
    ? episodesData.flatMap((server) => {
        const serverName = server?.server_name || server?.name || "";
        const list = server?.server_data || server || [];
        return Array.isArray(list)
          ? list.map((ep, idx) => ({
              ...ep,
              server_name: serverName,
              _serverIndex: idx,
            }))
          : [];
      })
    : [];

  return {
    movie,
    episodes: episodes.map((ep, idx) => ({
      name: ep.name || `Tập ${idx + 1}`,
      slug: ep.slug || `ep-${idx + 1}`,
      server_name: ep.server_name || "",
      link_m3u8: ep.link_m3u8 || ep.link_embed || ep.link || "",
      embed: ep.link_embed || ep.link_m3u8 || ep.link || "",
      _provider: "kkphim",
    })),
  };
};

export const searchKKphim = async (keyword, page = 1) => {
  const escapedKeyword = escapeHtmlSearch(keyword);
  const { data } = await kkphim.get("/tim-kiem", {
    params: { keyword: escapedKeyword, page },
  });
  const items = data?.data?.items || data?.items || [];
  return filterAdultMovies(items.map(normalizeKKphimMovie));
};

export const getKKphimByYear = async (year, page = 1) => {
  const [le, bo] = await Promise.all([
    kkphim
      .get("/danh-sach/phim-le", { params: { year, page } })
      .catch(() => ({ data: null })),
    kkphim
      .get("/danh-sach/phim-bo", { params: { year, page } })
      .catch(() => ({ data: null })),
  ]);
  const items = [
    ...(le?.data?.data?.items || le?.data?.items || []),
    ...(bo?.data?.data?.items || bo?.data?.items || []),
  ];
  return filterAdultMovies(uniqueBySlug(items).map(normalizeKKphimMovie));
};

export const getKKphimByCategory = async (slug, page = 1, extraParams = {}) => {
  const { data } = await kkphim.get(`/the-loai/${slug}`, {
    params: { page, ...extraParams },
  });
  const items = data?.data?.items || data?.items || [];
  return filterAdultMovies(uniqueBySlug(items).map(normalizeKKphimMovie));
};

export const getKKphimByCountry = async (slug, page = 1, extraParams = {}) => {
  const { data } = await kkphim.get(`/quoc-gia/${slug}`, {
    params: { page, ...extraParams },
  });
  const items = data?.data?.items || data?.items || [];
  return filterAdultMovies(uniqueBySlug(items).map(normalizeKKphimMovie));
};

export default kkphim;
