import client from "./client";
import { getTmdbDetailBySlug } from "./tmdb";

const demoMovies = [
  {
    slug: "demo-movie-1",
    name: "Demo Movie 1",
    poster_url:
      "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=600&q=80",
    thumb_url:
      "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1200&q=80",
    year: 2024,
    episode_current: "Full",
    category: ["Hành động"],
    content: "Bộ phim minh họa cho layout và player.",
  },
  {
    slug: "demo-movie-2",
    name: "Demo Series",
    poster_url:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80",
    thumb_url:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    year: 2023,
    episode_current: "Tập 1",
    category: ["Viễn tưởng"],
    content: "Dữ liệu mẫu khi API chưa sẵn sàng.",
  },
];

const demoEpisodes = [
  {
    name: "Tập 1",
    slug: "ep-1",
    link_m3u8: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
  {
    name: "Tập 2",
    slug: "ep-2",
    link_m3u8: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  },
];

const normalizePoster = (url = "") => {
  if (!url) return "https://placehold.co/600x900/0f172a/94a3b8?text=No+Image";
  if (url.startsWith("http")) return url;
  const cdn = import.meta.env.VITE_MOVIE_IMAGE_CDN || "";
  return cdn ? `${cdn}${url}` : url;
};

const normalizeMovie = (raw = {}) => {
  const poster =
    raw.thumb_url || raw.poster_url || raw.poster || raw.banner || "";
  const posterNormalized = normalizePoster(poster);

  return {
    slug: raw.slug || raw._id || raw.id || "unknown",
    name: raw.name || raw.title || raw.origin_name || "Chưa có tên",
    poster_url: posterNormalized,
    thumb_url: posterNormalized,
    year: raw.year || raw.released || raw.publishYear,
    episode_current: raw.episode_current || raw.episodeCurrent || raw.status,
    quality: raw.quality,
    lang: raw.lang,
    time: raw.time,
    country: raw.country,
    origin_name: raw.origin_name,
    category: raw.category || raw.genres || [],
    content: raw.content || raw.description || "",
    origin: raw,
  };
};

const unwrapItems = (data) =>
  data?.data?.items ||
  data?.items ||
  data?.movie ||
  data?.result ||
  data?.data?.item ||
  [];

const mapOrFallback = (items = [], fallback = demoMovies) =>
  items && items.length ? items.map(normalizeMovie) : fallback;

const withFallback = async (fn, fallback = {}) => {
  try {
    if (!client.defaults.baseURL) throw new Error("Missing baseURL");
    return await fn();
  } catch (error) {
    console.warn("[movie-api] Fallback data used:", error.message);
    return fallback;
  }
};

export const getLatest = () =>
  withFallback(async () => {
    const { data } = await client.get("/danh-sach/phim-moi");
    return mapOrFallback(unwrapItems(data));
  }, demoMovies);

export const getSeries = () =>
  withFallback(async () => {
    const { data } = await client.get("/danh-sach/phim-bo");
    return mapOrFallback(unwrapItems(data));
  }, demoMovies);

export const getSingle = () =>
  withFallback(async () => {
    const { data } = await client.get("/danh-sach/phim-le");
    return mapOrFallback(unwrapItems(data));
  }, demoMovies);

export const getCategory = (category) =>
  withFallback(async () => {
    const { data } = await client.get(`/the-loai/${category}`);
    return mapOrFallback(unwrapItems(data));
  }, demoMovies);

export const getCountry = (country) =>
  withFallback(async () => {
    const { data } = await client.get(`/quoc-gia/${country}`);
    return mapOrFallback(unwrapItems(data));
  }, demoMovies);

export const getDetail = (slug) =>
  withFallback(
    async () => {
      if (slug?.startsWith("tmdb-")) {
        return getTmdbDetailBySlug(slug);
      }

      const { data } = await client.get(`/phim/${slug}`);
      const payload = data?.data?.item || data?.movie || data?.data || data;
      const movie = normalizeMovie(payload);
      const episodes =
        payload?.episodes?.[0]?.server_data ||
        data?.data?.episodes?.[0]?.server_data ||
        data?.episodes?.[0]?.server_data ||
        payload?.episodes ||
        data?.episodes ||
        demoEpisodes;
      return {
        movie,
        episodes: episodes.map((ep, idx) => ({
          name: ep.name || ep.filename || `Tập ${idx + 1}`,
          slug: ep.slug || ep.name || `ep-${idx + 1}`,
          link_m3u8: ep.link_m3u8 || ep.m3u8 || ep.linkplay || ep.link || "",
          embed: ep.embed || ep.link_embed || ep.embed_url || ep.link || "",
        })),
      };
    },
    { movie: normalizeMovie(demoMovies[0]), episodes: demoEpisodes }
  );

export const searchMovies = (query, page = 1) =>
  withFallback(
    async () => {
      const { data } = await client.get("/tim-kiem", {
        params: { keyword: query, page },
      });
      return mapOrFallback(unwrapItems(data));
    },
    demoMovies.filter((movie) =>
      movie.name.toLowerCase().includes((query || "").toLowerCase())
    )
  );

export const getEpisodes = (slug) =>
  withFallback(async () => {
    const detail = await getDetail(slug);
    return detail.episodes || demoEpisodes;
  }, demoEpisodes);
