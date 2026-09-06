
import {
  getTmdbDetailBySlug,
  getTmdbFullEpisodes,
} from "./tmdb";

import {
  getKKphimDetail,
  searchKKphim,
  getKKphimLatest,
  getKKphimSeries,
  getKKphimSingle,
  getKKphimChieuRap,
  getKKphimHoatHinh,
  getKKphimByCategory,
  getKKphimByCountry,
  getKKphimByYear,
} from "./movies2";
import { isAdultMovie } from "@/utils/filter";





const parseEpisodeNumber = (value) => {
  if (!value) return null;
  const str = String(value).toLowerCase();

  // Do not extract numbers from special episodes so they don't overwrite main episodes
  if (
    str.includes("bts") ||
    str.includes("trailer") ||
    str.includes("teaser") ||
    str.includes("preview") ||
    str.includes("ngoại truyện") ||
    str.includes("special")
  ) {
    return null;
  }

  const match = str.match(/(\d+)/);
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

const normalizeProvider = () => {
  return "kkphim";
};

const getEpisodePlayableLink = (ep = {}) => {
  const link =
    ep.link_m3u8 || ep.m3u8 || ep.linkplay || ep.link || "";

  if (
    !link ||
    link.includes("iframe") ||
    link.includes("embed") ||
    link.includes("phimapi.com/player")
  ) {
    return "";
  }
  return link;
};

const getEpisodeSourceKind = (ep = {}) => {
  const link = getEpisodePlayableLink(ep);
  if (link) return "m3u8";
  return "unknown";
};

const normalizeEpisodeSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "ep-unknown";



const mergeEpisodes = (kkList = []) => {
  const map = new Map();


  const isEndEpisodeName = (name = "") => {
    const clean = name.toLowerCase();
    return (
      /\b(end|tập cuối|tap cuoi|hoàn tất|hoan tat)\b/.test(clean) ||
      /\.end\b/.test(clean) ||
      /[-_]end\b/.test(clean)
    );
  };

  const getEndEpisodeNumber = (list) => {
    for (const ep of list) {
      if (!ep) continue;
      const name = ep.name || ep.slug || "";
      if (isEndEpisodeName(name)) {
        const num = parseEpisodeNumber(ep.name || ep.slug);
        if (num !== null) return num;
      }
    }
    return null;
  };

  const primaryEndNum = getEndEpisodeNumber(kkList);

  const add = (list, priority, providerHint) => {
    const listEndNum = getEndEpisodeNumber(list);

    list.forEach((ep) => {
      if (!ep) return;
      const epNum = parseEpisodeNumber(ep.name || ep.slug);

      // Prevent merging incorrect extra episodes beyond the END marker
      if (primaryEndNum !== null && epNum !== null && epNum > primaryEndNum) {
        return;
      }
      if (listEndNum !== null && epNum !== null && epNum > listEndNum) {
        return;
      }

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

  add(kkList, 0, "kkphim");

  const merged = Array.from(map.values()).map(({ ep, sources }) => ({
    ...ep,
    _providers: sources || ep._providers || {},
    _preferredProvider:
      ep._preferredProvider || Object.keys(sources || {})[0] || ep._provider,
  }));
  merged.sort((a, b) => {
    const na = parseEpisodeNumber(a.name || a.slug) ?? Infinity;
    const nb = parseEpisodeNumber(b.name || b.slug) ?? Infinity;
    if (na !== nb) return na - nb;
    return (a.server_name || "").localeCompare(b.server_name || "");
  });
  return merged;
};


const withFallback = async (fn, fallback = null) => {
  try {
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

export const getLatest = getKKphimLatest;
export const getSeries = getKKphimSeries;
export const getSingle = getKKphimSingle;
export const getOphimChieuRap = getKKphimChieuRap;
export const getOphimHoatHinh = getKKphimHoatHinh;
export const getCategory = getKKphimByCategory;
export const getCountry = getKKphimByCountry;

export const getDetail = (slug) =>
  withFallback(
    async () => {
      if (slug?.startsWith("tmdb-")) {
        const tmdbData = await getTmdbDetailBySlug(slug);
        if (!tmdbData.movie) return tmdbData;

        try {
          const q = tmdbData.movie.name;
          if (q) {
            const items = await searchKKphim(q).catch(() => []);

            const normalized = (text) => (text || "").toLowerCase().trim();
            const namesToMatch = [
              tmdbData.movie.name,
              tmdbData.movie.origin_name,
            ]
              .map(normalized)
              .filter(Boolean);
            const targetYear = tmdbData.movie.year;

            const bestMatch = items.find((m) => {
              const mYear = m.year || m.publishYear || m.released;
              const nameHit =
                namesToMatch.includes(normalized(m.name)) ||
                namesToMatch.includes(normalized(m.origin_name));
              const yearHit =
                targetYear && mYear
                  ? String(mYear) === String(targetYear)
                  : true;
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

      // Fetch only from KKphim
      let kkResult = null;
      try {
        kkResult = await getKKphimDetail(slug, { signal: abortController.signal }).catch(
          (err) => {
            if (
              err.name === "CanceledError" ||
              err.code === "ERR_CANCELED" ||
              err.name === "AbortError"
            )
              throw new Error("KKphim aborted");
            throw err;
          }
        );
      } catch (error) {
        if (
          error.response?.status !== 404 &&
          error.status !== 404 &&
          !error.message.includes("aborted")
        ) {
          console.warn("[getDetail] KKphim failed", error.message);
        }
      }
      clearTimeout(timeoutId);

      const { movie: kkMovie, episodes: kkEpisodes = [] } = kkResult || {};

      const mergedEpisodes = mergeEpisodes(kkEpisodes);

      const episodes = (mergedEpisodes.length ? mergedEpisodes : []).map(
        (ep) => ({
          ...ep,
          slug: ep.slug || normalizeEpisodeSlug(ep.name),
        })
      );

      const movie = kkMovie?.name ? kkMovie : null;

      if (isAdultMovie(movie)) {
        return { movie: null, episodes: [] };
      }

      // Enrichment (Optional & Non-blocking):
      // Actors and other enhanced meta will be handled by asynchronous hooks in the UI.
      if (movie && !movie.slug?.startsWith("tmdb-")) {
        // You could fire enrichment here without await if mutation is acceptable,
        // but it's cleaner to let the useActorsWithTmdbImages hook handle it.
      }


      if (movie && episodes && episodes.length > 0) {
        let maxEpNum = -1;
        for (const ep of episodes) {
          const num = parseEpisodeNumber(ep.name || ep.slug);
          if (num !== null && num > maxEpNum) maxEpNum = num;
        }
        if (
          maxEpNum > 0 &&
          String(movie.episode_current).toLowerCase() !== "full"
        ) {
          movie.episode_current = `Tập ${maxEpNum}`;
        }
      }

      if ((!episodes || episodes.length === 0) && slug) {
        try {
          const cleanKeyword = slug
            .replace(/[-_]/g, " ")
            .replace(/\b(and|va|full|hd|raw|sub|tap|phim)\b/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (cleanKeyword) {
            const hits = await searchKKphim(cleanKeyword).catch(() => []);
            const firstHit = hits.find((m) => m?.slug && m.slug !== slug);
            if (firstHit?.slug) {
              const altDetail = await getKKphimDetail(firstHit.slug).catch(
                () => null
              );
              if (altDetail && altDetail.episodes?.length) {
                return {
                  movie: movie?.name ? movie : altDetail.movie,
                  episodes: altDetail.episodes.map((ep) => ({
                    ...ep,
                    slug: ep.slug || normalizeEpisodeSlug(ep.name),
                  })),
                };
              }
            }
          }
        } catch (e) {
          console.warn("[getDetail] final fallback search error", e);
        }
      }

      return { movie, episodes };
    },
    { movie: null, episodes: [] }
  );

export const searchMovies = searchKKphim;
export const getByYear = getKKphimByYear;

export const getEpisodes = (slug) =>
  withFallback(async () => {
    const detail = await getDetail(slug);
    return detail.episodes || [];
  }, []);
export const getTmdbEpisodes = (id, mediaType, seasons) =>
  getTmdbFullEpisodes(id, mediaType, seasons);
