import {
  Calendar,
} from "lucide-react";
import { doc, onSnapshot, increment, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "../firebase.config";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSavedMovie } from "../hooks/useSavedMovie.js";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { useMoviesList } from "../hooks/useMoviesList.js";
import { useMoviesByCountry } from "../hooks/useMoviesByCountry.js";
import { useWatchProgress } from "../hooks/useWatchProgress.js";
import { useActorsWithTmdbImages } from "../hooks/useActorsWithTmdbImages.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getLatestEpisodeNumber,
  normalizeServerLabel,
  parseEpisodeNumber,
} from "../utils/episodes.js";
import { getTmdbEpisodes } from "../api/movies.js";
import { useSeries } from "../hooks/useSeries.js";
import { getHiRes } from "../components/detail/detailUtils.js";
import DetailHero from "../components/detail/DetailHero.jsx";
import DetailMobileContent from "../components/detail/DetailMobileContent.jsx";
import DetailDesktopContent from "../components/detail/DetailDesktopContent.jsx";
import DetailResumeModal from "../components/detail/DetailResumeModal.jsx";

const Detail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading } = useMovieDetail(slug);
  const { user } = useAuth();
  const { loadProgress, clearProgress } = useWatchProgress();
  const { groups, currentSeason } = useSeries(data?.movie);

  // Thừa hưởng dữ liệu cơ bản từ card (poster, name) nếu có, để tránh "Chưa có tên"
  const passedMovie = location.state?.movie;

  const [resumeData, setResumeData] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [movieOverride, setMovieOverride] = useState(null);
  const [tmdbFullEpisodes, setTmdbFullEpisodes] = useState([]);
  const { movie: baseMovie, episodes: baseEpisodes = [] } = data || {};
  const isTmdb = baseMovie?.slug?.startsWith("tmdb-");
  const tmdbScheduleId = isTmdb ? baseMovie?.origin?.id : baseMovie?.tmdb?.id;
  const tmdbScheduleMediaType = isTmdb
    ? baseMovie?.origin_type
    : baseMovie?.tmdb?.mediaType;
  const tmdbScheduleSeasons = isTmdb
    ? baseMovie?.seasons
    : baseMovie?.tmdb?.seasons;
  const canUseTmdbSchedule = Boolean(
    tmdbScheduleId && tmdbScheduleMediaType === "tv"
  );

  // Fetch all TMDB episodes for air-date logic
  useEffect(() => {
    if (!canUseTmdbSchedule) return;

    const fetchAll = async () => {
      try {
        const eps = await getTmdbEpisodes(
          tmdbScheduleId,
          "tv",
          tmdbScheduleSeasons || []
        );
        setTmdbFullEpisodes(Array.isArray(eps) ? eps : []);
      } catch (err) {
        console.error("[tmdb] failed to fetch extra episodes", err);
        setTmdbFullEpisodes([]);
      }
    };
    fetchAll();
  }, [canUseTmdbSchedule, tmdbScheduleId, tmdbScheduleSeasons, setTmdbFullEpisodes]);

  // Listen for admin movie override (trailer mode)
  useEffect(() => {
    if (!db || !slug) return;
    const unsub = onSnapshot(
      doc(db, "movieOverrides", slug),
      (snap) => {
        setMovieOverride(snap.exists() ? snap.data() : { mode: "full" });
      },
      (err) => {
        console.warn("MovieOverride error:", err);
        setMovieOverride({ mode: "full" });
      }
    );
    return unsub;
  }, [slug, setMovieOverride]);

  // Load watch progress for the modal
  useEffect(() => {
    if (!user || !slug) return;
    let cancelled = false;
    loadProgress(slug).then((data) => {
      if (cancelled || !data) return;
      if (data.currentTime > 10) {
        setResumeData(data);
        setShowResumeModal(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, slug, loadProgress, setResumeData, setShowResumeModal]);

  const handleResume = useCallback(() => {
    if (!resumeData) return;
    const q = new URLSearchParams();
    if (resumeData.episodeSlug) q.set("episode", resumeData.episodeSlug);
    if (resumeData.server) q.set("server", resumeData.server);
    navigate(`/watch/${slug}?${q.toString()}`, {
      state: { initialTime: resumeData.currentTime },
    });
  }, [resumeData, slug, navigate]);

  const handleStartFromBeginning = useCallback(() => {
    clearProgress(slug);
    setShowResumeModal(false);
  }, [slug, clearProgress, setShowResumeModal]);

  // Only search for alternatives if this is a TMDB-primary movie AND we don't have enough episodes yet
  const needsAltSearch = isTmdb && (!baseEpisodes || baseEpisodes.length < 1);
  const { data: altResults = [], isLoading: loadingAlts } = useSearchMovies(
    needsAltSearch ? baseMovie?.name : ""
  );

  const bestAltMatch = useMemo(() => {
    if (!isTmdb || loadingAlts) return null;
    const normalized = (text) => (text || "").toLowerCase().trim();
    const namesToMatch = [baseMovie?.name, baseMovie?.origin_name]
      .flatMap(n => n ? [normalized(n)] : []);
    const targetYear = baseMovie?.year;

    return altResults.find((m) => {
      const nameHit =
        namesToMatch.includes(normalized(m.name)) ||
        namesToMatch.includes(normalized(m.origin_name));
      const yearHit =
        targetYear && m.year ? String(m.year) === String(targetYear) : true;
      return nameHit && yearHit;
    });
  }, [
    altResults,
    baseMovie?.name,
    baseMovie?.origin_name,
    baseMovie?.year,
    isTmdb,
    loadingAlts,
  ]);
  const {
    isSaved,
    loading: saving,
    error,
    toggleSave,
  } = useSavedMovie(baseMovie);

  const altSlug =
    bestAltMatch && bestAltMatch.slug !== slug ? bestAltMatch.slug : null;

  const { data: altDetail } = useMovieDetail(
    altSlug && altSlug !== slug ? altSlug : null
  );

  const episodes = useMemo(() => {
    const altEpisodes = altDetail?.episodes || [];
    if (isTmdb && altEpisodes.length) return altEpisodes;
    return baseEpisodes;
  }, [altDetail?.episodes, baseEpisodes, isTmdb]);

  const movie = useMemo(() => {
    const detailMovie = altDetail?.movie || baseMovie;
    // Nếu API đã trả về và có tên hợp lệ, dùng nó. Nếu không, dùng passedMovie từ trang chủ.
    if (detailMovie?.name && detailMovie.name !== "unknown") return detailMovie;
    return passedMovie || detailMovie || null;
  }, [altDetail?.movie, baseMovie, passedMovie]);

  const categorySlugs = useMemo(
    () => (movie?.category || []).flatMap((c) => c.slug ? [c.slug] : []),
    [movie?.category]
  );
  const countrySlug = movie?.country?.[0]?.slug;

  const [deferLoad, setDeferLoad] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDeferLoad(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // ––– View Tracking Logic (Request Volume) –––
  useEffect(() => {
    if (!slug || !db) return;

    const trackView = async () => {
      try {
        const viewRef = doc(db, "movieViews", slug);
        const updateData = {
          slug,
          name: movie?.name || movie?.title || slug,
          poster: movie?.poster_url || movie?.thumb_url || "",
          views: increment(1),
          lastViewedAt: serverTimestamp(),
        };

        if (user?.uid) {
          updateData.userIds = arrayUnion(user.uid);
        }

        await setDoc(viewRef, updateData, { merge: true });
      } catch (err) {
        console.warn("[ViewTracking] Error updating views:", err);
      }
    };

    trackView();
  }, [slug, movie, user]); // Count every visit (request) to this page

  const { data: cat1Pool = [] } = useMoviesList("latest", categorySlugs[0], {
    enabled: deferLoad && !!categorySlugs[0],
  });
  const { data: cat2Pool = [] } = useMoviesList("latest", categorySlugs[1], {
    enabled: deferLoad && !!categorySlugs[1],
  });
  const { data: countryPool = [] } = useMoviesByCountry(countrySlug, {
    enabled: deferLoad && !!countrySlug,
  });

  const relatedMovies = useMemo(() => {
    const combined = [];
    const max = 24;
    const len = Math.max(cat1Pool.length, cat2Pool.length, countryPool.length);

    for (let i = 0; i < len; i++) {
      if (cat1Pool[i]) combined.push(cat1Pool[i]);
      if (countryPool[i]) combined.push(countryPool[i]);
      if (cat2Pool[i]) combined.push(cat2Pool[i]);
      if (combined.length >= max) break;
    }

    const seen = new Set();
    seen.add(movie?.slug);
    return combined
      .filter((m) => {
        if (!m || !m.slug || seen.has(m.slug)) return false;
        seen.add(m.slug);
        return true;
      })
      .slice(0, 16);
  }, [cat1Pool, cat2Pool, countryPool, movie?.slug]);

  const serverGroups = useMemo(() => {
    if (!episodes?.length) return {};
    return episodes.reduce((acc, ep) => {
      if (!ep) return acc;
      const label = normalizeServerLabel(ep.server_name);
      acc[label] = acc[label] || [];
      acc[label].push(ep);
      return acc;
    }, {});
  }, [episodes]);

  const isMovie = useMemo(() => {
    if (!episodes?.length) return false;
    const nums = new Set(
      episodes.flatMap((ep) => {
        const n = parseEpisodeNumber(ep.name || ep.slug);
        return n !== null ? [n] : [];
      })
    );
    return nums.size <= 1;
  }, [episodes]);

  const hasVietsub = !!serverGroups.Vietsub?.length;
  const hasLongTieng = !!serverGroups["Lồng Tiếng"]?.length;
  const hasThuyetMinh = !!serverGroups["Thuyết Minh"]?.length;

  const preferredServer = useMemo(() => {
    if (hasVietsub) return "Vietsub";
    if (hasLongTieng) return "Lồng Tiếng";
    if (hasThuyetMinh) return "Thuyết Minh";
    return Object.keys(serverGroups)[0] || null;
  }, [hasLongTieng, hasThuyetMinh, hasVietsub, serverGroups]);

  const [userSelectedServer, setUserSelectedServer] = useState(null);
  const [mobileSection, setMobileSection] = useState("episodes");

  const selectedServer = useMemo(() => {
    if (userSelectedServer && serverGroups[userSelectedServer])
      return userSelectedServer;
    return preferredServer;
  }, [preferredServer, serverGroups, userSelectedServer]);

  const selectedEpisodes = useMemo(() => {
    if (selectedServer && serverGroups[selectedServer])
      return serverGroups[selectedServer];
    return episodes;
  }, [episodes, selectedServer, serverGroups]);

  const actors = useMemo(() => {
    // Prioritize actors from the original TMDB source if available
    const baseActors = baseMovie?.slug?.startsWith("tmdb-")
      ? baseMovie?.actor
      : null;

    const pools = [
      baseActors,
      movie?.actor,
      movie?.actors,
      movie?.cast,
      movie?.origin?.actor,
      movie?.origin?.actors,
      movie?.origin?.cast,
    ];

    const collect = pools.flatMap((item) => {
      if (!item) return [];
      if (Array.isArray(item)) return item;
      if (typeof item === "string") return item.split(/[,/|]/);
      return [];
    });

    const normalized = collect.flatMap((entry) => {
      if (!entry) return [];
      let parsed = null;
      if (typeof entry === "string") {
        parsed = { id: null, name: entry.trim(), image: null };
      } else if (typeof entry === "object") {
        parsed = {
          id: entry.id || entry.tmdb_id || entry.person_id || null,
          name: String(
            entry.name || entry.full_name || entry.title || ""
          ).trim(),
          image:
            entry.avatar ||
            entry.image ||
            entry.profile_path ||
            entry.photo ||
            entry.thumbnail ||
            null,
        };
      }
      return parsed && parsed.name ? [parsed] : [];
    });

    const seen = new Set();
    return normalized.filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });
  }, [movie, baseMovie?.actor, baseMovie?.slug]);

  const { data: actorsWithImages = actors } = useActorsWithTmdbImages(actors);

  const isActuallyLoading =
    (isLoading && !passedMovie) ||
    (isTmdb && loadingAlts && !altDetail?.movie && !passedMovie);

  const isTrailer = useMemo(() => {
    const statusTextLower = (
      movie?.status ||
      movie?.episode_current ||
      ""
    ).toLowerCase();
    return (
      statusTextLower.includes("trailer") ||
      (episodes.length === 0 && !isActuallyLoading)
    );
  }, [
    movie?.status,
    movie?.episode_current,
    episodes.length,
    isActuallyLoading,
  ]);

  // While loading, we show the page frame (Layout is already around it)
  // but without the "noisy" blocky blocks.
  if (isActuallyLoading)
    return (
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center -mt-20">
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] z-0" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="loader-orbit loader-orbit-lg"></div>
          {/* Loading text removed for minimalist feel */}
        </div>
      </div>
    );

  const latestSelectedEpisodeNumber = selectedEpisodes.reduce((max, ep) => {
    const n = parseEpisodeNumber(ep?.name || ep?.slug);
    return n !== null && n !== undefined ? Math.max(max, n) : max;
  }, -1);

  const latestCatalogEpisodeNumber = getLatestEpisodeNumber(movie, episodes);
  const latestEpisodeNumber =
    latestSelectedEpisodeNumber >= 0
      ? latestSelectedEpisodeNumber
      : latestCatalogEpisodeNumber;


  const epTotal = parseEpisodeNumber(movie?.episode_total);
  const statusText = (
    movie?.status ||
    movie?.episode_current ||
    ""
  ).toLowerCase();
  const hasMissingEpisodesInSelectedServer =
    epTotal &&
    latestSelectedEpisodeNumber >= 0 &&
    latestSelectedEpisodeNumber < epTotal;
  const isCompleted =
    !hasMissingEpisodesInSelectedServer &&
    (/hoan tat|hoàn tất|hoan thanh|trọn bộ|tron bo|full|completed/.test(
      statusText
    ) ||
      (latestEpisodeNumber >= 0 && epTotal && latestEpisodeNumber >= epTotal));

  const nextEpisodeText =
    movie?.next_episode_time ||
    movie?.nextEpisodeTime ||
    movie?.schedule ||
    movie?.air_time ||
    movie?.release_time ||
    movie?.upcoming_time ||
    movie?.time ||
    movie?.origin?.time;

  const nextEpisodeNumber =
    latestEpisodeNumber >= 0 ? latestEpisodeNumber + 1 : null;

  const getLocalIsoDate = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const MM = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${MM}-${dd}`;
  };

  const parseNextTime = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    const lower = raw.toLowerCase();

    // Ignore durations like "43 phút/tập"; only show when it looks like a schedule
    if (/phu?t|phút|min|minute/.test(lower)) return null;

    // Try native Date first (handles ISO or RFC formats)
    const parsedNative = Date.parse(raw);
    if (!Number.isNaN(parsedNative)) {
      const d = new Date(parsedNative);
      const hh = `${d.getHours()}`.padStart(2, "0");
      const mm = `${d.getMinutes()}`.padStart(2, "0");
      const dd = `${d.getDate()}`.padStart(2, "0");
      const MM = `${d.getMonth() + 1}`.padStart(2, "0");
      const yyyy = d.getFullYear();
      return { label: `${hh}h${mm} ngày ${dd}/${MM}/${yyyy}`, date: d };
    }

    // Try pattern: YYYY-MM-DD or YYYY/MM/DD with optional HH:mm(:ss)
    const isoMatch = raw.match(
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[^\d]+(\d{1,2})[:h](\d{2}))?/
    );
    if (isoMatch) {
      const [, yyyy, MM, dd, hh, mm] = isoMatch;
      const day = dd.padStart(2, "0");
      const month = MM.padStart(2, "0");
      const date = new Date(
        Number(yyyy),
        Number(MM) - 1,
        Number(dd),
        hh ? Number(hh) : 0,
        mm ? Number(mm) : 0,
        0,
        0
      );
      if (hh && mm) {
        const hour = hh.padStart(2, "0");
        return {
          label: `${hour}h${mm} ngày ${day}/${month}/${yyyy}`,
          date,
        };
      }
      return { label: `Ngày ${day}/${month}/${yyyy}`, date };
    }

    // Try pattern: HH:mm DD/MM/YYYY or variants with separators
    const regex =
      /(?:(\d{1,2})[:h](\d{2}))?[^\d]*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
    const match = raw.match(regex);
    if (match) {
      const [, hh, mm, dd, MM, yyyy] = match;
      const hour = hh ? hh.padStart(2, "0") : null;
      const minute = mm ? mm.padStart(2, "0") : null;
      const day = dd.padStart(2, "0");
      const month = MM.padStart(2, "0");
      const year = `${yyyy}`.length === 2 ? `20${yyyy}` : yyyy;
      const date = new Date(
        Number(year),
        Number(MM) - 1,
        Number(dd),
        hour ? Number(hour) : 0,
        minute ? Number(minute) : 0,
        0,
        0
      );
      if (hour && minute)
        return {
          label: `${hour}h${minute} ngày ${day}/${month}/${year}`,
          date,
        };
      return { label: `Ngày ${day}/${month}/${year}`, date };
    }

    // Fallback: show raw text
    return { label: raw, date: null };
  };

  const nextTimeInfo = parseNextTime(nextEpisodeText);
  const formattedNextTime = nextTimeInfo?.label || null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isNextTimeInFuture = nextTimeInfo?.date
    ? nextTimeInfo.date.getTime() >= startOfToday.getTime()
    : false;

  const upcomingTmdbMessage = (() => {
    if (isCompleted) return null;
    if (!canUseTmdbSchedule || !tmdbFullEpisodes.length) return null;

    const tmdbEpisodes = tmdbFullEpisodes.flatMap((ep) => {
      if (ep?.air_date && Number.isFinite(Number(ep?.episode_number))) {
        return [{
          ...ep,
          episode_number: Number(ep.episode_number),
          air_date: String(ep.air_date),
        }];
      }
      return [];
    });

    if (!tmdbEpisodes.length) return null;

    // Pick the next airing date from today (local time) onward.
    const todayIso = getLocalIsoDate();
    const upcoming = tmdbEpisodes.filter((ep) => ep.air_date >= todayIso);
    if (!upcoming.length) return null;

    const nextAirDate = upcoming.reduce(
      (min, ep) => (ep.air_date < min ? ep.air_date : min),
      upcoming[0].air_date
    );
    const matchingEpisodes = upcoming.filter(
      (ep) => ep.air_date === nextAirDate
    );
    const [y, m, d] = nextAirDate.split("-");
    const formattedDate = `${d}/${m}/${y}`;

    const epNums = Array.from(
      new Set(matchingEpisodes.map((ep) => ep.episode_number))
    ).sort((a, b) => a - b);
    if (!epNums.length) return null;

    const epLabel =
      epNums.length > 2 ? `${epNums[0]}, ${epNums[1]}, ...` : epNums.join(", ");

    return `Tập ${epLabel} sẽ phát vào ngày ${formattedDate}.`;
  })();

  const fallbackUpcomingText =
    !isCompleted && formattedNextTime && isNextTimeInFuture && nextEpisodeNumber
      ? `Tập ${nextEpisodeNumber} sẽ phát hành vào ${formattedNextTime}.`
      : null;

  const upcomingNotice = upcomingTmdbMessage
    ? {
      icon: <Calendar className="size-4" />,
      text: upcomingTmdbMessage,
    }
    : fallbackUpcomingText
      ? {
        icon: <Calendar className="size-4" />,
        text: fallbackUpcomingText,
      }
      : null;

  const heroImage = getHiRes(
    passedMovie?.thumb_url ||
    passedMovie?.backdrop_url ||
    movie?.backdrop_url ||
    movie?.banner ||
    movie?.thumb_url ||
    passedMovie?.poster_url ||
    movie?.poster_url
  );

  return (
    <div className="relative">
      <div className="relative z-10 flex flex-col gap-y-8 lg:gap-y-12 pb-16">
        <DetailHero
          movie={movie}
          passedMovie={passedMovie}
          heroImage={heroImage}
          slug={slug}
          isMovie={isMovie}
          isTrailer={isTrailer}
          latestEpisodeNumber={latestEpisodeNumber}
          epTotal={epTotal}
          movieOverride={movieOverride}
          episodes={episodes}
          selectedServer={selectedServer}
          navigate={navigate}
          isSaved={isSaved}
          saving={saving}
          error={error}
          toggleSave={toggleSave}
          mobileSection={mobileSection}
          setMobileSection={setMobileSection}
        />

        <DetailMobileContent
          mobileSection={mobileSection}
          movie={movie}
          episodes={episodes}
          selectedEpisodes={selectedEpisodes}
          serverGroups={serverGroups}
          selectedServer={selectedServer}
          setUserSelectedServer={setUserSelectedServer}
          isMovie={isMovie}
          isCompleted={isCompleted}
          epTotal={epTotal}
          upcomingNotice={upcomingNotice}
          movieOverride={movieOverride}
          isTmdb={isTmdb}
          actorsWithImages={actorsWithImages}
          relatedMovies={relatedMovies}
          groups={groups}
          currentSeason={currentSeason}
          hasVietsub={hasVietsub}
          hasLongTieng={hasLongTieng}
          hasThuyetMinh={hasThuyetMinh}
        />

        <DetailDesktopContent
          movie={movie}
          episodes={episodes}
          selectedEpisodes={selectedEpisodes}
          serverGroups={serverGroups}
          selectedServer={selectedServer}
          setUserSelectedServer={setUserSelectedServer}
          isMovie={isMovie}
          isCompleted={isCompleted}
          epTotal={epTotal}
          upcomingNotice={upcomingNotice}
          movieOverride={movieOverride}
          isTmdb={isTmdb}
          actorsWithImages={actorsWithImages}
          relatedMovies={relatedMovies}
          groups={groups}
          currentSeason={currentSeason}
          hasVietsub={hasVietsub}
          hasLongTieng={hasLongTieng}
          hasThuyetMinh={hasThuyetMinh}
        />
      </div>

      <DetailResumeModal
        show={showResumeModal}
        resumeData={resumeData}
        movie={movie}
        onResume={handleResume}
        onStartFromBeginning={handleStartFromBeginning}
      />
    </div>
  );
};

export default Detail;
