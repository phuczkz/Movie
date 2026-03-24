import client from "./client";
import { getTmdbDetailBySlug, searchTmdbMovie, getTmdbCredits, getTmdbByGenre, searchTmdbPerson, getTmdbPersonCredits } from "./tmdb";


import { getKKphimDetail } from "./kkphim";

const fallbackPortrait =
  "https://placehold.co/600x900/0f172a/94a3b8?text=No+Image";
const fallbackLandscape =
  "https://placehold.co/1600x900/0f172a/94a3b8?text=No+Image";

const tmdbProfileBase = import.meta.env.VITE_TMDB_PROFILE_BASE;

const normalizePoster = (url = "") => {
  if (!url) return fallbackPortrait;
  if (url.startsWith("http")) return url;
  const cdn = import.meta.env.VITE_MOVIE_IMAGE_CDN || "";
  return cdn ? `${cdn}${url}` : url;
};

const normalizeLandscape = (url = "") => {
  if (!url) return fallbackLandscape;
  if (url.startsWith("http")) return url;
  const cdn = import.meta.env.VITE_MOVIE_IMAGE_CDN || "";
  return cdn ? `${cdn}${url}` : url;
};

const normalizeMovie = (raw = {}) => {
  const poster =
    raw.poster_url || raw.poster || raw.thumb_url || raw.banner || "";
  const backdrop =
    raw.banner || raw.backdrop_url || raw.thumb_url || raw.poster_url || "";
  const posterNormalized = normalizePoster(poster);
  const thumbNormalized = normalizeLandscape(backdrop);

  return {
    slug: raw.slug || raw._id || raw.id || "unknown",
    name: raw.name || raw.title || raw.origin_name || null,
    poster_url: posterNormalized,
    thumb_url: thumbNormalized,
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

const normalizePeople = (peoples = []) => {
  if (!Array.isArray(peoples)) return [];
  const seen = new Set();

  const cdn = import.meta.env.VITE_MOVIE_IMAGE_CDN || "";

  const pickImage = (p) => {
    const raw =
      p?.profile_path ||
      p?.avatar ||
      p?.image ||
      p?.photo ||
      p?.thumbnail ||
      p?.thumb ||
      "";
    if (!raw) return null;
    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("/")) return `${tmdbProfileBase}${raw}`;
    return cdn ? `${cdn}${raw}` : raw;
  };

  const list = peoples
    .map((p) => {
      const name = p?.name || p?.original_name || p?.full_name || "";
      if (!name) return null;
      const image = pickImage(p);
      return {
        name,
        image,
        character: p?.character,
      };
    })
    .filter(Boolean);

  return list.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
};

const parseEpisodeNumber = (value) => {
  if (!value) return null;
  const match = String(value).match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const stripDiacritics = (text = "") =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeServerName = (name) => {
  const raw = (name || "").toString().trim();
  const plain = stripDiacritics(raw).toLowerCase();

  if (!raw) return "Vietsub";
  if (plain.includes("thuyet") || plain.includes("thuy minh"))
    return "Thuyết Minh";
  if (plain.includes("long") && plain.includes("tieng")) return "Lồng Tiếng";
  if (plain.includes("viet")) return "Vietsub";
  return raw;
};

const mergeEpisodes = (kkList = [], ophimList = []) => {
  const map = new Map();

  const add = (list, priority) => {
    list.forEach((ep) => {
      if (!ep) return;
      const epNum = parseEpisodeNumber(ep.name || ep.slug);
      const serverLabel = normalizeServerName(
        ep.server_name || ep.server || ep.serverName
      );
      const baseKey = epNum !== null ? `ep-${epNum}` : ep.slug || ep.name;
      const key = `${serverLabel || "default"}__${baseKey}`;
      if (!baseKey) return;

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
        map.set(key, {
          ep: { ...ep, server_name: serverLabel },
          priority,
          epNum: epNum ?? -1,
        });
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
    if (na !== nb) return na - nb;
    return (a.server_name || "").localeCompare(b.server_name || "");
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
    // TMDB Animation category integration
    if (category === "hoat-hinh") {
      return getTmdbByGenre(16, page);
    }

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
        // Silently ignore 404s as they are expected for some movies only available on one source
        if (error.response?.status !== 404) {
          console.warn("[getDetail] KKphim failed", error.message);
        }
      }

      let ophimMovie = null;
      let ophimEpisodes = [];
      try {
        const { data } = await client.get(`/phim/${slug}`);
        const payload = data?.data?.item || data?.movie || data?.data || data;
        ophimMovie = normalizeMovie(payload);
        const ophimActors = normalizePeople(
          payload?.peoples || payload?.people
        );
        if (ophimMovie && ophimActors.length) {
          ophimMovie.actor = ophimActors;
        }
        const rawEpisodes =
          payload?.episodes || data?.data?.episodes || data?.episodes || [];
        ophimEpisodes = Array.isArray(rawEpisodes)
          ? rawEpisodes.flatMap((server, serverIdx) => {
            const serverName =
              server?.server_name || server?.name || server?.server || "";
            const list = server?.server_data || server || [];
            return Array.isArray(list)
              ? list.map((ep, idx) => ({
                ...ep,
                server_name: serverName,
                _serverIndex: serverIdx,
                _epIndex: idx,
              }))
              : [];
          })
          : [];
      } catch (error) {
        // Silently ignore 404s as they are expected for some movies only available on one source
        if (error.response?.status !== 404) {
          console.warn("[getDetail] Ophim failed", error.message);
        }
      }

      const kkEpisodes = kkResult?.episodes || [];
      const mergedEpisodes = mergeEpisodes(kkEpisodes, ophimEpisodes);

      const episodes = (mergedEpisodes.length ? mergedEpisodes : []).map(
        (ep, idx) => ({
          name: ep.name || ep.filename || `Tập ${idx + 1}`,
          slug: ep.slug || ep.name || `ep-${idx + 1}`,
          server_name: normalizeServerName(ep.server_name),
          link_m3u8:
            ep.link_m3u8 || ep.m3u8 || ep.linkplay || ep.link || ep.embed || "",
          embed: ep.embed || ep.link_embed || ep.embed_url || ep.link || "",
        })
      );

      const kkMovie = kkResult?.movie ? normalizeMovie(kkResult.movie) : null;

      // Prefer KKPhim as the primary source for basic metadata (Poster, Banner, Title)
      // to avoid 'slug collisions' where Ophim provides the wrong movie details.
      const movie = kkMovie?.name ? kkMovie : (ophimMovie?.name ? ophimMovie : null);

      // Smart enrichment: complement KKPhim data with additional details from Ophim (like actors)
      if (movie && movie === kkMovie && ophimMovie) {
        const kkName = (movie.name || "").toLowerCase().trim();
        const kkOrg = (movie.origin_name || "").toLowerCase().trim();
        const opName = (ophimMovie.name || "").toLowerCase().trim();
        const opOrg = (ophimMovie.origin_name || "").toLowerCase().trim();

        // Check if movies are likely the same
        const isSameMovie =
          kkName === opName ||
          kkOrg === opOrg ||
          (kkOrg && opOrg && (kkOrg.includes(opOrg) || opOrg.includes(kkOrg)));

        if (isSameMovie) {
          if (!movie.content && ophimMovie.content)
            movie.content = ophimMovie.content;
          if ((!movie.actor || !movie.actor.length) && ophimMovie.actor) {
            movie.actor = ophimMovie.actor;
          }
        }
      }

      // Final enrichment: Always try to find the movie on TMDB to ensure a consistent, 
      // high-quality cast list with proper avatars and TMDB Person IDs.
      if (movie && !movie.slug?.startsWith("tmdb-")) {
        try {
          // Identify potential TMDB match
          const tmdbMatch = await searchTmdbMovie(movie.name || movie.origin_name, movie.year);
          if (tmdbMatch) {
            const tmdbActors = await getTmdbCredits(tmdbMatch.id, tmdbMatch.media_type);
            if (tmdbActors && tmdbActors.length) {
              // If we already have actors from Ophim, try to merge or prefer TMDB if more complete
              if (!movie.actor || !movie.actor.length) {
                movie.actor = tmdbActors;
              } else {
                // Merge logic: match by name and update image + id
                movie.actor = movie.actor.map(original => {
                  const match = tmdbActors.find(ta =>
                    ta.name.toLowerCase() === original.name.toLowerCase() ||
                    original.name.toLowerCase().includes(ta.name.toLowerCase()) ||
                    ta.name.toLowerCase().includes(original.name.toLowerCase())
                  );
                  return match ? { ...original, image: match.image || original.image, id: match.id } : original;
                });

                // Also add actors from TMDB that weren't in the original list but are prominent (first 10)
                const existingNames = new Set(movie.actor.map(a => a.name.toLowerCase()));
                const tmdbExclusives = tmdbActors.slice(0, 10).filter(ta => !existingNames.has(ta.name.toLowerCase()));
                movie.actor = [...movie.actor, ...tmdbExclusives];
              }
            }
          }
        } catch (enrichError) {
          console.warn("[getDetail] TMDB enrichment failed", enrichError.message);
        }
      }



      return { movie, episodes };
    },
    { movie: null, episodes: [] }
  );

export const searchMovies = (query, page = 1) =>
  withFallback(async () => {
    const q = (query || "").trim();
    if (!q) return [];

    // Parallel search: don't let one source failure block the other
    const ophimPromise = client
      .get("/tim-kiem", { params: { keyword: q, page } })
      .then((res) => mapOrFallback(unwrapItems(res.data)))
      .catch((err) => {
        console.warn("[searchMovies] Ophim failed", err.message);
        return [];
      });

    const actorPromise = searchTmdbPerson(q)
      .then(async (person) => {
        if (!person) return [];
        return await getTmdbPersonCredits(person.id);
      })
      .catch((err) => {
        console.warn("[searchMovies] Actor search failed", err.message);
        return [];
      });

    const [ophimMovies, actorMovies] = await Promise.all([
      ophimPromise,
      actorPromise,
    ]);

    // 3. Merge and deduplicate (Prioritize actor results)
    return uniqueBySlug([...actorMovies, ...ophimMovies]);

  }, []);



export const getEpisodes = (slug) =>
  withFallback(async () => {
    const detail = await getDetail(slug);
    return detail.episodes || [];
  }, []);
