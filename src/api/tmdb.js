import axios from "axios";
import { filterAdultMovies, isAdultMovie } from "../utils/filter";
import { parseSeasonInfo } from "../utils/episodes";

// Using the Proxy URL to keep the API Key secret on the server
const baseURL = "https://stream.khophim.io.vn/tmdb/";
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
export const searchTmdbMovie = async (query, year) => {
  if (!query) return null;
  try {
    const { data } = await tmdb.get("search/multi", {
      params: { query, year },
    });
    const results = data?.results || [];
    // Focus on movie/tv results that have a backdrop or poster
    return results.find(
      (r) =>
        (r.media_type === "movie" || r.media_type === "tv") &&
        (r.poster_path || r.backdrop_path)
    );
  } catch (error) {
    console.warn("[tmdb] search failed", error.message);
    return null;
  }
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
 * Tries `name` first, then `originName` if no result.
 * Prefers Vietnamese → English → any language.
 * Returns null if no logo is found.
 */
export const getTmdbLogo = async (name, originName, year) => {
  if (!name && !originName) return null;

  // Clean the name (e.g. "Movie Name (Phần 2)" -> "Movie Name")
  const { baseName: cleanName } = parseSeasonInfo(name || "");
  const { baseName: cleanOrigin } = parseSeasonInfo(originName || "");

  try {
    // Try primary name first, then fall back to origin_name
    let match = cleanName ? await searchTmdbMovie(cleanName, year) : null;

    // If search with year failed, try without year
    if (!match && cleanName) {
      match = await searchTmdbMovie(cleanName);
    }

    if (!match && cleanOrigin && cleanOrigin !== cleanName) {
      match = await searchTmdbMovie(cleanOrigin, year);
      if (!match) match = await searchTmdbMovie(cleanOrigin);
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

    // Use original for maximum sharpness on all devices
    return `https://image.tmdb.org/t/p/original${pick.file_path}`;
  } catch (error) {
    console.warn("[tmdb] logo fetch failed", error.message);
    return null;
  }
};
