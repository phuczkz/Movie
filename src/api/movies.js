import client from "./client";
import {
  getTmdbDetailBySlug,
  getTmdbByGenre,
  searchTmdbPerson,
  getTmdbPersonCredits,
  getTmdbFullEpisodes,
} from "./tmdb";

import { getKKphimDetail } from "./kkphim";
import { filterAdultMovies, isAdultMovie } from "../utils/filter";

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
  let rawPoster = raw.poster_url || "";
  let rawThumb = raw.thumb_url || "";

  const isRelativeOphim = (url) => url && !url.startsWith("http");

  if (isRelativeOphim(rawPoster) && isRelativeOphim(rawThumb)) {
    // Swap: Ophim's thumb_url is actually portrait, poster_url is actually landscape
    [rawPoster, rawThumb] = [rawThumb, rawPoster];
  }

  const poster = rawPoster || raw.poster || rawThumb || raw.banner || "";
  const backdrop =
    raw.banner || raw.backdrop_url || rawThumb || rawPoster || "";
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
  if (plain.includes("subteam")) return "Vietsub";
  if (plain.includes("thuyet") || plain.includes("thuy minh"))
    return "Thuyết Minh";
  if (plain.includes("long") && plain.includes("tieng")) return "Lồng Tiếng";
  if (plain.includes("viet")) return "Vietsub";
  return raw;
};

const normalizeProvider = (provider) => {
  const value = (provider || "").toString().trim().toLowerCase();
  return value === "ophim" ? "ophim" : "kkphim";
};

const getEpisodePlayableLink = (ep = {}) =>
  ep.link_m3u8 || ep.m3u8 || ep.linkplay || ep.link || ep.embed || "";

const getEpisodeSourceKind = (ep = {}) => {
  if (ep.link_m3u8 || ep.m3u8) return "m3u8";
  if (ep.embed || ep.linkplay || ep.link) return "embed";
  return "unknown";
};

const normalizeEpisodeSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "ep-unknown";

const getNumericEpisodeRange = (list = []) => {
  const nums = Array.from(
    new Set(
      list
        .map((ep) => parseEpisodeNumber(ep?.name || ep?.slug))
        .filter((n) => Number.isFinite(n))
    )
  ).sort((a, b) => a - b);

  if (!nums.length) return null;
  return {
    min: nums[0],
    max: nums[nums.length - 1],
    nums,
  };
};

const areEpisodeRangesCompatible = (primaryRange, secondaryRange) => {
  if (!primaryRange || !secondaryRange) return true;

  const overlap =
    Math.max(primaryRange.min, secondaryRange.min) <=
    Math.min(primaryRange.max, secondaryRange.max);
  if (overlap) return true;

  const distance = Math.min(
    Math.abs(secondaryRange.min - primaryRange.max),
    Math.abs(primaryRange.min - secondaryRange.max)
  );

  // Allow minor gaps (e.g. primary has 1-5 and secondary has 6-10),
  // but reject clearly different numbering schemes (e.g. 1-6 vs 36-49).
  return distance <= 2;
};

const mergeEpisodes = (kkList = [], ophimList = []) => {
  const map = new Map();

  const kkRange = getNumericEpisodeRange(kkList);
  const ophimRange = getNumericEpisodeRange(ophimList);
  const canMergeOphimIntoKk =
    !kkList.length || areEpisodeRangesCompatible(kkRange, ophimRange);

  const add = (list, priority, providerHint) => {
    list.forEach((ep) => {
      if (!ep) return;
      const epNum = parseEpisodeNumber(ep.name || ep.slug);
      const provider = normalizeProvider(
        ep._provider || ep.provider || providerHint
      );
      const serverLabel = normalizeServerName(
        ep.server_name || ep.server || ep.serverName
      );
      const baseKey = epNum !== null ? `ep-${epNum}` : ep.slug || ep.name;
      const key = `${serverLabel || "default"}__${baseKey}`;
      if (!baseKey) return;

      const current = map.get(key);
      const prefers = !current || priority < current.priority;
      const playableLink = getEpisodePlayableLink(ep);
      // Prefer entries that have a playable link
      const hasLink = Boolean(playableLink);
      const nextSources = {
        ...(current?.sources || {}),
      };
      if (hasLink) {
        nextSources[provider] = {
          link: playableLink,
          kind: getEpisodeSourceKind(ep),
        };
      }

      const currentHasLink = Boolean(
        Object.values(nextSources).some((item) => item?.link) ||
        current?.ep?.link_m3u8 ||
        current?.ep?.m3u8 ||
        current?.ep?.linkplay ||
        current?.ep?.link ||
        current?.ep?.embed
      );

      if (prefers || (!currentHasLink && hasLink)) {
        map.set(key, {
          ep: {
            ...ep,
            server_name: serverLabel,
            _provider: provider,
            _preferredProvider: provider,
            _providers: nextSources,
          },
          priority,
          epNum: epNum ?? -1,
          sources: nextSources,
        });
      } else if (hasLink && current) {
        map.set(key, {
          ...current,
          sources: nextSources,
          ep: {
            ...current.ep,
            _providers: nextSources,
          },
        });
      }
    });
  };

  // priority: 0 = KKphim, 1 = Ophim
  add(kkList, 0, "kkphim");
  if (canMergeOphimIntoKk) {
    add(ophimList, 1, "ophim");
  }

  const merged = Array.from(map.values()).map(({ ep, sources }) => ({
    ...ep,
    _providers: sources || ep._providers || {},
    _preferredProvider:
      ep._preferredProvider || Object.keys(sources || {})[0] || ep._provider,
  }));
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
  items && items.length ? filterAdultMovies(items.map(normalizeMovie)) : fallback;

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
    if (
      error?.response?.status !== 404 &&
      error?.code !== "ERR_CANCELED" &&
      error?.name !== "CanceledError" &&
      error?.name !== "AbortError"
    ) {
      console.warn("[movie-api] Fallback data used:", error.message);
    }
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

export const getOphimChieuRap = (page = 1) =>
  withFallback(async () => {
    const { data } = await client.get("/danh-sach/phim-chieu-rap", {
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
    if (category === "phim-thuyet-minh") {
      const { data } = await client.get("/danh-sach/phim-thuyet-minh", {
        params: { page },
      });
      return mapOrFallback(uniqueBySlug(unwrapItems(data)));
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
        const tmdbData = await getTmdbDetailBySlug(slug);
        if (!tmdbData.movie) return tmdbData;

        try {
          const q = tmdbData.movie.name;
          if (q) {
            const res = await client.get("/tim-kiem", { params: { keyword: q } }).catch(() => null);
            const rawItems = res?.data?.data?.items || res?.data?.items || res?.data?.movie || res?.data?.result || [];
            const items = Array.isArray(rawItems) ? rawItems : [];

            const normalized = (text) => (text || "").toLowerCase().trim();
            const namesToMatch = [tmdbData.movie.name, tmdbData.movie.origin_name]
              .map(normalized)
              .filter(Boolean);
            const targetYear = tmdbData.movie.year;

            const bestMatch = items.find((m) => {
              const mYear = m.year || m.publishYear || m.released;
              const nameHit =
                namesToMatch.includes(normalized(m.name)) ||
                namesToMatch.includes(normalized(m.origin_name));
              const yearHit =
                targetYear && mYear ? String(mYear) === String(targetYear) : true;
              return nameHit && yearHit;
            });

            if (bestMatch && bestMatch.slug && bestMatch.slug !== slug) {
              const altDetail = await getDetail(bestMatch.slug);
              if (altDetail && altDetail.episodes?.length) {
                tmdbData.episodes = altDetail.episodes;
              }
            }
          }
        } catch (e) {
          console.warn("[getDetail] Error resolving alt tmdb episodes", e);
        }

        if (!tmdbData.episodes || tmdbData.episodes.length === 0) {
          tmdbData.movie.episode_current = "Trailer";
          tmdbData.movie.quality = "Trailer";
          tmdbData.movie.lang = "Trailer";
        }

        return tmdbData;
      }
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8 seconds global timeout for detail

      // Parallel fetch from both sources to avoid sequential timeout delays
      const [kkResultSettled, ophimResultSettled] = await Promise.allSettled([
        getKKphimDetail(slug, { signal: abortController.signal }).catch(
          (err) => {
            if (
              err.name === "CanceledError" ||
              err.code === "ERR_CANCELED" ||
              err.name === "AbortError"
            )
              throw new Error("KKphim aborted");
            throw err;
          }
        ),
        client
          .get(`/phim/${slug}`, { signal: abortController.signal })
          .catch((err) => {
            if (
              err.name === "CanceledError" ||
              err.code === "ERR_CANCELED" ||
              err.name === "AbortError"
            )
              throw new Error("Ophim aborted");
            throw err;
          }),
      ]);
      clearTimeout(timeoutId);

      let kkResult = null;
      if (kkResultSettled.status === "fulfilled") {
        kkResult = kkResultSettled.value;
      } else {
        const error = kkResultSettled.reason;
        if (
          error.response?.status !== 404 &&
          error.status !== 404 &&
          !error.message.includes("aborted")
        ) {
          console.warn("[getDetail] KKphim failed", error.message);
        }
      }

      const { movie: kkMovie, episodes: kkEpisodes = [] } = kkResult || {};

      let ophimMovie = null;
      let ophimEpisodes = [];
      if (ophimResultSettled.status === "fulfilled") {
        const { data } = ophimResultSettled.value;
        const payload = data?.data?.item || data?.movie || data?.data || data;
        ophimMovie = normalizeMovie(payload);
        const ophimActors = normalizePeople(
          payload?.peoples ||
          payload?.people ||
          payload?.actor ||
          payload?.cast ||
          payload?.actors
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
                _provider: "ophim",
              }))
              : [];
          })
          : [];
      } else {
        const error = ophimResultSettled.reason;
        if (
          error.response?.status !== 404 &&
          error.status !== 404 &&
          !error.message.includes("aborted")
        ) {
          console.warn("[getDetail] Ophim failed", error.message);
        }
      }

      const mergedEpisodes = mergeEpisodes(kkEpisodes, ophimEpisodes);

      const episodes = (mergedEpisodes.length ? mergedEpisodes : []).map(
        (ep) => ({
          ...ep,
          slug: ep.slug || normalizeEpisodeSlug(ep.name),
        })
      );

      // Prefer KKPhim as the primary source for basic metadata (Poster, Banner, Title)
      // to avoid 'slug collisions' where Ophim provides the wrong movie details.
      const movie = kkMovie?.name
        ? kkMovie
        : ophimMovie?.name
          ? ophimMovie
          : null;

      if (isAdultMovie(movie)) {
        return { movie: null, episodes: [] };
      }

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

      // Enrichment (Optional & Non-blocking):
      // We no longer block the main fetch for TMDB enrichment to ensure fast loading.
      // Actors and other enhanced meta will be handled by asynchronous hooks in the UI.
      if (movie && !movie.slug?.startsWith("tmdb-")) {
        // You could fire enrichment here without await if mutation is acceptable,
        // but it's cleaner to let the useActorsWithTmdbImages hook handle it.
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

export const getByYear = (year, page = 1) =>
  withFallback(async () => {
    const [le, bo] = await Promise.all([
      client
        .get("/danh-sach/phim-le", { params: { year, page } })
        .catch(() => ({ data: null })),
      client
        .get("/danh-sach/phim-bo", { params: { year, page } })
        .catch(() => ({ data: null })),
    ]);
    const items = [...unwrapItems(le?.data), ...unwrapItems(bo?.data)];
    return mapOrFallback(uniqueBySlug(items));
  }, []);

export const getEpisodes = (slug) =>
  withFallback(async () => {
    const detail = await getDetail(slug);
    return detail.episodes || [];
  }, []);
export const getTmdbEpisodes = (id, mediaType, seasons) =>
  getTmdbFullEpisodes(id, mediaType, seasons);
