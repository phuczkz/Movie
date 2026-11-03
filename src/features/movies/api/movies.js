
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
import {
  getSecondaryEpisodes,
  getSecondaryDetail,
  searchSecondaryApi,
  SECONDARY_PROVIDER_KEY,
} from "./supplementalApi";





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

const normalizeProvider = (provider) => {
  if (provider === SECONDARY_PROVIDER_KEY) return SECONDARY_PROVIDER_KEY;
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

// Trả về link embed (iframe player của KKphim) nếu có, dùng làm nguồn dự phòng.
const getEpisodeEmbedLink = (ep = {}) => {
  const link = ep.link_embed || ep.embed || "";
  if (!link) return "";
  // Chỉ lấy link dạng embed/iframe, không lấy link m3u8 trực tiếp vào đây
  if (
    link.includes("iframe") ||
    link.includes("embed") ||
    link.includes("phimapi.com/player")
  ) {
    return link;
  }
  // Nếu link_embed trỏ thẳng vào .m3u8 (không phải iframe), bỏ qua
  return "";
};

const normalizeEpisodeSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "ep-unknown";



const mergeEpisodes = (kkList = [], secondaryList = []) => {
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

  // Highest episode number from secondary source
  const secondaryLatestEpNum = secondaryList.reduce((max, ep) => {
    const n = parseEpisodeNumber(ep?.name || ep?.slug);
    return n !== null && n !== undefined ? Math.max(max, n) : max;
  }, -1);

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
      const playableLink = getEpisodePlayableLink(ep);
      const embedLink = getEpisodeEmbedLink(ep);
      const effectiveLink = playableLink || embedLink || ep.link || "";
      const hasLink = Boolean(effectiveLink);

      const nextSources = {
        ...(current?.sources || {}),
        ...(ep._providers || {}),
      };

      if (playableLink) {
        nextSources[provider] = {
          link: playableLink,
          kind: "m3u8",
        };
      } else if (embedLink) {
        nextSources[provider] = {
          link: embedLink,
          kind: "embed",
        };
      }

      // Lưu link embed như một nguồn dự phòng (fallback provider).
      if (embedLink && !nextSources["backup"]) {
        nextSources["backup"] = {
          link: embedLink,
          kind: "embed",
        };
      }

      const currentHasLink = Boolean(
        Object.values(current?.sources || {}).some((item) => item?.link) ||
          current?.ep?.link_m3u8 ||
          current?.ep?.link_embed ||
          current?.ep?.link
      );

      const prefers = !current || priority < current.priority;

      // "khi click vào tập mới nhất của API 2 thì lúc đó sẽ dùng nguồn 2 để phát"
      const isSecondaryLatest =
        provider === SECONDARY_PROVIDER_KEY &&
        epNum !== null &&
        epNum >= secondaryLatestEpNum &&
        secondaryLatestEpNum > 0;

      if (prefers || (!currentHasLink && hasLink)) {
        map.set(key, {
          ep: {
            ...ep,
            server_name: serverLabel,
            _provider: isSecondaryLatest ? SECONDARY_PROVIDER_KEY : provider,
            _preferredProvider: isSecondaryLatest
              ? SECONDARY_PROVIDER_KEY
              : (ep._preferredProvider || provider),
            _providers: nextSources,
          },
          priority,
          epNum: epNum ?? -1,
          sources: nextSources,
        });
      } else if (current) {
        const targetPreferred = isSecondaryLatest
          ? SECONDARY_PROVIDER_KEY
          : current.ep._preferredProvider || current.ep._provider;

        map.set(key, {
          ...current,
          sources: nextSources,
          ep: {
            ...current.ep,
            _providers: nextSources,
            _preferredProvider: targetPreferred,
          },
        });
      }
    });
  };

  add(kkList, 0, "kkphim");
  // Merge secondary source episodes (priority 1)
  add(secondaryList, 1, SECONDARY_PROVIDER_KEY);

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
            let items = await searchKKphim(q).catch(() => []);
            if (
              (!items || items.length === 0) &&
              tmdbData.movie.origin_name &&
              tmdbData.movie.origin_name !== q
            ) {
              items = await searchKKphim(tmdbData.movie.origin_name).catch(
                () => []
              );
            }

            const normalized = (text) => (text || "").toLowerCase().trim();
            const namesToMatch = [
              tmdbData.movie.name,
              tmdbData.movie.origin_name,
            ]
              .map(normalized)
              .filter(Boolean);
            const targetYear = tmdbData.movie.year;

            const bestMatch = (items || []).find((m) => {
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
                if (altDetail.movie) {
                  // Keep accurate episode/status from KKphim if available
                  if (altDetail.movie.episode_current) {
                    tmdbData.movie.episode_current = altDetail.movie.episode_current;
                  }
                  if (altDetail.movie.quality) {
                    tmdbData.movie.quality = altDetail.movie.quality;
                  }
                  if (altDetail.movie.lang) {
                    tmdbData.movie.lang = altDetail.movie.lang;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("[getDetail] Error resolving alt tmdb episodes", e);
        }

        if (!tmdbData.episodes || tmdbData.episodes.length === 0) {
          // Only tag as Trailer if it is truly unreleased or marked as Trailer
          const isActuallyTrailer =
            tmdbData.movie.episode_current === "Trailer" ||
            tmdbData.movie.quality === "Trailer";
          if (isActuallyTrailer) {
            tmdbData.movie.episode_current = "Trailer";
            tmdbData.movie.quality = "Trailer";
            tmdbData.movie.lang = "Trailer";
          }
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

      let secondaryResult = null;
      if (kkMovie?.name) {
        // Fetch supplemental episodes from secondary source (non-blocking, best-effort)
        try {
          secondaryResult = await getSecondaryEpisodes(
            slug,
            kkMovie.name,
            kkMovie.origin_name,
            kkMovie.year
          );
        } catch (e) {
          if (
            e?.response?.status !== 404 &&
            e?.status !== 404 &&
            e?.code !== "ERR_CANCELED" &&
            e?.name !== "CanceledError" &&
            e?.name !== "AbortError"
          ) {
            console.warn("[getDetail] Secondary source fetch failed", e?.message);
          }
        }
      } else {
        // KKphim has no movie for this slug (movie only exists on secondary source).
        // Fetch movie details and episodes directly from secondary source.
        try {
          secondaryResult = await getSecondaryDetail(slug, { signal: abortController.signal });
          if (!secondaryResult?.movie) {
            const cleanSlug = slug
              .replace(/[-_]/g, " ")
              .replace(/\b(and|va|full|hd|raw|sub|tap|phim)\b/gi, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (cleanSlug) {
              const hits = await searchSecondaryApi(cleanSlug);
              const bestHit = hits?.find(
                (h) => h?.slug === slug || (h?.name && cleanSlug.includes(h.name.toLowerCase()))
              );
              if (bestHit?.slug) {
                secondaryResult = await getSecondaryDetail(bestHit.slug, {
                  signal: abortController.signal,
                });
              }
            }
          }
        } catch (e) {
          if (
            e?.response?.status !== 404 &&
            e?.status !== 404 &&
            e?.code !== "ERR_CANCELED" &&
            e?.name !== "CanceledError" &&
            e?.name !== "AbortError"
          ) {
            console.warn("[getDetail] Secondary direct detail fetch failed", e?.message);
          }
        }
      }

      const secondaryEpisodes = secondaryResult?.episodes || [];
      const secMovie = secondaryResult?.movie || null;

      const mergedEpisodes = mergeEpisodes(kkEpisodes, secondaryEpisodes);

      const episodes = (mergedEpisodes.length ? mergedEpisodes : []).map(
        (ep) => ({
          ...ep,
          slug: ep.slug || normalizeEpisodeSlug(ep.name),
        })
      );

      const movie = kkMovie?.name ? kkMovie : (secMovie?.name ? secMovie : null);

      if (isAdultMovie(movie)) {
        return { movie: null, episodes: [] };
      }

      if (movie && episodes && episodes.length > 0) {
        const currentEpLower = String(movie.episode_current || "").toLowerCase();
        const statusLower = String(movie.status || "").toLowerCase();
        const isTrailerMeta =
          currentEpLower.includes("trailer") ||
          currentEpLower.includes("teaser") ||
          statusLower.includes("trailer") ||
          statusLower.includes("teaser");

        if (!isTrailerMeta) {
          let maxEpNum = -1;
          for (const ep of episodes) {
            const num = parseEpisodeNumber(ep.name || ep.slug);
            if (num !== null && num > maxEpNum) maxEpNum = num;
          }
          if (
            maxEpNum > 0 &&
            currentEpLower !== "full"
          ) {
            movie.episode_current = `Tập ${maxEpNum}`;
          }
        }
      }

      const isTrailerMovie = Boolean(
        String(movie?.episode_current || "").toLowerCase().includes("trailer") ||
        String(movie?.status || "").toLowerCase().includes("trailer") ||
        String(movie?.episode_current || "").toLowerCase().includes("teaser") ||
        String(movie?.status || "").toLowerCase().includes("teaser")
      );

      if (!isTrailerMovie && (!episodes || episodes.length === 0) && slug) {
        try {
          const cleanKeyword = slug
            .replace(/[-_]/g, " ")
            .replace(/\b(and|va|full|hd|raw|sub|tap|phim)\b/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (cleanKeyword && movie?.name) {
            const hits = await searchKKphim(cleanKeyword).catch(() => []);
            const normalized = (text) => (text || "").toLowerCase().trim();
            const namesToMatch = [movie.name, movie.origin_name]
              .filter(Boolean)
              .map(normalized);
            const targetYear = movie.year;

            const bestHit = hits.find((m) => {
              if (!m?.slug || m.slug === slug) return false;
              const nameHit =
                namesToMatch.includes(normalized(m.name)) ||
                namesToMatch.includes(normalized(m.origin_name));
              const mYear = m.year || m.publishYear || m.released;
              const yearHit =
                targetYear && mYear
                  ? String(mYear) === String(targetYear)
                  : true;
              return nameHit && yearHit;
            });

            if (bestHit?.slug) {
              const altDetail = await getKKphimDetail(bestHit.slug).catch(
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
