import axios from "axios";

const apiKey = import.meta.env.VITE_TMDB_API_KEY || "";
const baseURL = import.meta.env.VITE_TMDB_API || "https://api.themoviedb.org/3";
const posterBase =
  import.meta.env.VITE_TMDB_IMAGE_BASE || "https://image.tmdb.org/t/p/w500";
const backdropBase =
  import.meta.env.VITE_TMDB_BACKDROP_BASE || "https://image.tmdb.org/t/p/w780";

const placeholder = "https://placehold.co/600x900/0f172a/94a3b8?text=No+Image";

const tmdb = axios.create({
  baseURL,
  timeout: 15000,
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

const normalizeTmdbMovie = (raw = {}) => {
  const slug = raw.id ? `tmdb-${raw.id}` : "tmdb-unknown";
  const poster_url = buildImage(raw.poster_path, posterBase);
  const thumb_url = buildImage(
    raw.backdrop_path || raw.poster_path,
    backdropBase
  );

  const year = raw.release_date || raw.first_air_date || "";

  return {
    slug,
    name: raw.title || raw.name || "Chưa có tên",
    poster_url,
    thumb_url,
    year: year ? year.slice(0, 4) : undefined,
    episode_current: raw.status || "",
    quality: raw.original_language?.toUpperCase(),
    lang: raw.original_language?.toUpperCase(),
    time: raw.runtime ? `${raw.runtime} phút` : undefined,
    category: raw.genres?.map((g) => g.name) || raw.genre_ids || [],
    content: raw.overview,
    rating: raw.vote_average,
    origin_source: "tmdb",
    origin: raw,
  };
};

export const getPopular = async (page = 1) => {
  if (!apiKey) throw new Error("Missing VITE_TMDB_API_KEY");
  const { data } = await tmdb.get("/movie/popular", {
    params: { api_key: apiKey, page },
  });
  return data?.results?.map(normalizeTmdbMovie) || [];
};

export const getTmdbDetailBySlug = async (slug) => {
  if (!apiKey) throw new Error("Missing VITE_TMDB_API_KEY");
  const id = slug.replace("tmdb-", "");
  const { data } = await tmdb.get(`/movie/${id}`, {
    params: { api_key: apiKey },
  });
  const movie = normalizeTmdbMovie(data);
  return { movie, episodes: [] };
};
