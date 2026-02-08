import axios from "axios";

const apiBase = import.meta.env.VITE_KKPHIM_API || "https://phimapi.com/v1/api";
const imageCdn = (
  import.meta.env.VITE_KKPHIM_IMAGE_CDN || "https://phimimg.com"
).replace(/\/$/, "");
const placeholder = "https://placehold.co/600x900/0f172a/94a3b8?text=No+Image";

const kkphim = axios.create({
  baseURL: apiBase,
  timeout: 15000,
});

kkphim.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error.message ||
      "KKphim request failed";
    return Promise.reject(new Error(message));
  }
);

const normalizePosterUrl = (url = "") => {
  const trimmed = (url || "").trim();
  if (!trimmed) return placeholder;
  if (trimmed.startsWith("http")) return trimmed;
  const clean = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${imageCdn}${clean}`;
};

const normalizeKKphimMovie = (raw = {}) => {
  const poster_url = normalizePosterUrl(raw.poster_url || raw.thumb_url);
  const thumb_url = normalizePosterUrl(raw.thumb_url || raw.poster_url);

  return {
    slug: raw.slug || raw._id || raw.id || "unknown",
    name: raw.name || raw.title || "Chưa có tên",
    origin_name: raw.origin_name || "",
    poster_url,
    thumb_url,
    year: raw.year,
    episode_current: raw.episode_current || raw.status || "",
    episode_total: raw.episode_total || "",
    quality: raw.quality || "",
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

const fetchList = async (path, page = 1) => {
  const { data } = await kkphim.get(path, { params: { page } });
  const items = data?.data?.items || data?.items || [];
  return uniqueBySlug(items).map(normalizeKKphimMovie);
};

export const getKKphimLatest = (page = 1) =>
  fetchList("/danh-sach/phim-moi-cap-nhat", page);
export const getKKphimSeries = (page = 1) =>
  fetchList("/danh-sach/phim-bo", page);
export const getKKphimSingle = (page = 1) =>
  fetchList("/danh-sach/phim-le", page);

export const getKKphimDetail = async (slug) => {
  const { data } = await kkphim.get(`/phim/${slug}`);
  const movieData = data?.data?.item || data?.item || data?.movie || data;
  const movie = normalizeKKphimMovie(movieData);
  const episodesData = movieData?.episodes || [];
  const flattenedEpisodes = Array.isArray(episodesData)
    ? episodesData.flatMap((server) => server?.server_data || server || [])
    : [];
  const episodes = flattenedEpisodes.length ? flattenedEpisodes : [];

  return {
    movie,
    episodes: episodes.map((ep, idx) => ({
      name: ep.name || `Tập ${idx + 1}`,
      slug: ep.slug || `ep-${idx + 1}`,
      link_m3u8: ep.link_m3u8 || ep.link_embed || ep.link || "",
      embed: ep.link_embed || ep.link_m3u8 || ep.link || "",
    })),
  };
};

export const searchKKphim = async (keyword, page = 1) => {
  const { data } = await kkphim.get("/tim-kiem", {
    params: { keyword, page },
  });
  const items = data?.data?.items || data?.items || [];
  return items.map(normalizeKKphimMovie);
};

export const getKKphimByCategory = async (slug, page = 1) => {
  const { data } = await kkphim.get(`/the-loai/${slug}`, { params: { page } });
  const items = data?.data?.items || data?.items || [];
  return uniqueBySlug(items).map(normalizeKKphimMovie);
};

export const getKKphimByCountry = async (slug, page = 1) => {
  const { data } = await kkphim.get(`/quoc-gia/${slug}`, { params: { page } });
  const items = data?.data?.items || data?.items || [];
  return uniqueBySlug(items).map(normalizeKKphimMovie);
};

export default kkphim;
