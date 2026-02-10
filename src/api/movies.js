import client from "./client";
import { getTmdbDetailBySlug } from "./tmdb";
import { getKKphimDetail } from "./kkphim";


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
    episode_total: raw.episode_total || raw.episodeTotal,
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

const parseEpisodeNumber = (value) => {
  if (!value) return null;
  const match = String(value).match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const mergeEpisodes = (kkList = [], ophimList = []) => {
  const map = new Map();

  const add = (list, priority) => {
    list.forEach((ep) => {
      if (!ep) return;
      const epNum = parseEpisodeNumber(ep.name || ep.slug);
      const key = epNum !== null ? `ep-${epNum}` : ep.slug || ep.name;
      if (!key) return;

      const current = map.get(key);
      const prefers = !current || priority < current.priority;
      // Prefer entries that have a playable link
      const hasLink = Boolean(
        ep.link_m3u8 || ep.m3u8 || ep.linkplay || ep.link || ep.embed
      );
      const currentHasLink = Boolean(
        current?.ep?.link_m3u8 ||
          current?.ep?.m3u8 ||
          current?.ep?.linkplay ||
          current?.ep?.link ||
          current?.ep?.embed
      );

      if (prefers || (!currentHasLink && hasLink)) {
        map.set(key, { ep, priority, epNum: epNum ?? -1 });
      }
    });
  };

  // priority: 0 = KKphim, 1 = Ophim
  add(kkList, 0);
  add(ophimList, 1);

  const merged = Array.from(map.values()).map(({ ep }) => ep);
  merged.sort((a, b) => {
    const na = parseEpisodeNumber(a.name || a.slug) ?? -1;
    const nb = parseEpisodeNumber(b.name || b.slug) ?? -1;
    return nb - na;
  });
  return merged;
};

const unwrapItems = (data) =>
  data?.data?.items ||
  data?.items ||
  data?.movie ||
  data?.result ||
  data?.data?.item ||
  [];

const mapOrFallback = (items = [], fallback = []) =>
  items && items.length ? items.map(normalizeMovie) : fallback;

const uniqueBySlug = (items = []) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item?.slug || item?._id || item?.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const withFallback = async (fn, fallback = null) => {
  try {
    if (!client.defaults.baseURL) throw new Error("Missing baseURL");
    return await fn();
  } catch (error) {
    console.warn("[movie-api] Fallback data used:", error.message);
    return fallback;
  }
};

export const getLatest = (page = 1) =>
  withFallback(async () => {
    const { data } = await client.get("/danh-sach/phim-moi", {
      params: { page },
    });
    return mapOrFallback(unwrapItems(data));
  }, []);

export const getSeries = (page = 1) =>
  withFallback(async () => {
    const { data } = await client.get("/danh-sach/phim-bo", {
      params: { page },
    });
    return mapOrFallback(unwrapItems(data));
  }, []);

export const getSingle = (page = 1) =>
  withFallback(async () => {
    const { data } = await client.get("/danh-sach/phim-le", {
      params: { page },
    });
    return mapOrFallback(unwrapItems(data));
  }, []);

export const getCategory = (category, page = 1) =>
  withFallback(async () => {
    const { data } = await client.get(`/the-loai/${category}`, {
      params: { page },
    });
    return mapOrFallback(uniqueBySlug(unwrapItems(data)));
  }, []);
export const getCountry = (country, page = 1) =>
  withFallback(async () => {
    const { data } = await client.get(`/quoc-gia/${country}`, {
      params: { page },
    });
    return mapOrFallback(uniqueBySlug(unwrapItems(data)));
  }, []);

export const getDetail = (slug) =>
  withFallback(
    async () => {
      if (slug?.startsWith("tmdb-")) {
        return getTmdbDetailBySlug(slug);
      }

      let kkResult = null;
      try {
        kkResult = await getKKphimDetail(slug);
      } catch (error) {
        console.warn("[getDetail] KKphim failed", error.message);
      }

      let ophimMovie = null;
      let ophimEpisodes = [];
      try {
        const { data } = await client.get(`/phim/${slug}`);
        const payload = data?.data?.item || data?.movie || data?.data || data;
        ophimMovie = normalizeMovie(payload);
        const rawEpisodes =
          payload?.episodes || data?.data?.episodes || data?.episodes || [];
        ophimEpisodes = Array.isArray(rawEpisodes)
          ? rawEpisodes.flatMap((server) => server?.server_data || server || [])
          : [];
      } catch (error) {
        console.warn("[getDetail] Ophim failed", error.message);
      }

      const kkEpisodes = kkResult?.episodes || [];
      const mergedEpisodes = mergeEpisodes(kkEpisodes, ophimEpisodes);

      const episodes = (mergedEpisodes.length ? mergedEpisodes : []).map(
        (ep, idx) => ({
        name: ep.name || ep.filename || `Tập ${idx + 1}`,
        slug: ep.slug || ep.name || `ep-${idx + 1}`,
        link_m3u8:
          ep.link_m3u8 || ep.m3u8 || ep.linkplay || ep.link || ep.embed || "",
        embed: ep.embed || ep.link_embed || ep.embed_url || ep.link || "",
        })
      );

      const kkMovie = kkResult?.movie ? normalizeMovie(kkResult.movie) : null;
      const hasKkLatest =
        (kkEpisodes?.length || 0) &&
        parseEpisodeNumber(kkEpisodes[0]?.name || kkEpisodes[0]?.slug) !== null;
      const movie =
        hasKkLatest && kkMovie?.name ? kkMovie : ophimMovie || kkMovie || null;

      return { movie, episodes };
    },
    { movie: null, episodes: [] }
  );

export const searchMovies = (query, page = 1) =>
  withFallback(
    async () => {
      const { data } = await client.get("/tim-kiem", {
        params: { keyword: query, page },
      });
      return mapOrFallback(unwrapItems(data));
    },
    []
  );

export const getEpisodes = (slug) =>
  withFallback(async () => {
    const detail = await getDetail(slug);
    return detail.episodes || [];
  }, []);
