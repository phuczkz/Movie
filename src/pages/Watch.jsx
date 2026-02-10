import { useEffect, useRef } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  Globe2,
  Info,
  ListChecks,
  Play,
  Star,
  Timer,
} from "lucide-react";
import Player from "../components/Player.jsx";
import { useMovieDetail } from "../hooks/useMovieDetail.js";
import { useSearchMovies } from "../hooks/useSearchMovies.js";
import { getEpisodeLabel, parseEpisodeNumber } from "../utils/episodes.js";

const Watch = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const [params] = useSearchParams();
  const selectedEpisode = params.get("episode");
  const { data, isLoading } = useMovieDetail(slug);

  const { movie, episodes = [] } = data || {};
  const episodesList = Array.isArray(episodes) ? [...episodes] : [];
  const isTmdb = movie?.slug?.startsWith("tmdb-");
  const { data: altResults = [], isLoading: loadingAlts } = useSearchMovies(
    isTmdb ? movie?.name : ""
  );

  const activeEpisode =
    episodesList.find((ep) => ep.slug === selectedEpisode) ||
    episodesList[0] ||
    null;

  const sortedEpisodes = episodesList
    .map((ep, idx) => ({
      ep,
      idx,
      num: parseEpisodeNumber(ep?.name || ep?.slug),
    }))
    .sort((a, b) => {
      const aHasNum = a.num !== null && a.num !== undefined;
      const bHasNum = b.num !== null && b.num !== undefined;
      if (aHasNum && bHasNum) return a.num - b.num;
      if (aHasNum) return -1;
      if (bHasNum) return 1;
      return a.idx - b.idx;
    })
    .map(({ ep }) => ep);

  const currentIndex = activeEpisode
    ? sortedEpisodes.findIndex((ep) => ep.slug === activeEpisode.slug)
    : -1;
  const nextEpisode =
    currentIndex >= 0 ? sortedEpisodes[currentIndex + 1] || null : null;

  useEffect(() => {
    if (!selectedEpisode || !playerRef.current) return;
    playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedEpisode]);

  if (isLoading)
    return <div className="text-slate-300">Đang tải player...</div>;

  if (!episodes.length && isTmdb) {
    // TMDB không có stream: chỉ chuyển nếu tìm thấy phim trùng tên (hoặc tên gốc) và trùng năm trên Ophim.
    const normalized = (text) => (text || "").toLowerCase().trim();
    const namesToMatch = [movie?.name, movie?.origin_name]
      .map(normalized)
      .filter(Boolean);
    const targetYear = movie?.year;

    const bestMatch = loadingAlts
      ? null
      : altResults.find((m) => {
          const nameHit =
            namesToMatch.includes(normalized(m.name)) ||
            namesToMatch.includes(normalized(m.origin_name));
          const yearHit =
            targetYear && m.year ? String(m.year) === String(targetYear) : true;
          return nameHit && yearHit;
        });

    if (bestMatch) {
      return <Navigate to={`/watch/${bestMatch.slug}`} replace />;
    }

    return (
      <div className="space-y-3">
        <p className="text-slate-200">
          TMDB không có nguồn, đang tìm nguồn khác...
        </p>
        <Link
          to={`/movie/${slug}`}
          className="inline-flex items-center gap-2 text-emerald-300 hover:underline"
        >
          <Info className="h-4 w-4" />
          Quay lại trang chi tiết
        </Link>
      </div>
    );
  }

  if (!episodes.length) {
    return (
      <div className="space-y-3">
        <p className="text-slate-200">Phim này chưa có nguồn phát.</p>
        <Link
          to={`/movie/${slug}`}
          className="inline-flex items-center gap-2 text-emerald-300 hover:underline"
        >
          <Info className="h-4 w-4" />
          Quay lại trang chi tiết
        </Link>
      </div>
    );
  }

  const statusLabel = getEpisodeLabel(movie, episodes);
  const notifyText = movie?.notify || movie?.showtimes;
  const categoriesText = movie?.category?.map((c) => c.name || c).join(", ");
  const countryText = movie?.country?.map((c) => c.name || c).join(", ");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
          Đang xem
        </p>
        <h1 className="text-2xl font-bold text-white">{movie?.name}</h1>
        {activeEpisode ? (
          <p className="text-slate-300">{activeEpisode.name} </p>
        ) : null}
      </div>

      <div ref={playerRef}>
        <Player
          source={activeEpisode?.link_m3u8 || activeEpisode?.embed}
          poster={movie?.thumb_url || movie?.poster_url}
          title={movie?.name}
          subtitle={activeEpisode?.name}
          onNextEpisode={() => {
            if (!nextEpisode) return;
            navigate(
              `/watch/${slug}?episode=${encodeURIComponent(
                nextEpisode.slug || nextEpisode.name
              )}`
            );
          }}
          hasNextEpisode={Boolean(nextEpisode)}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="w-full max-w-[140px] overflow-hidden rounded-xl border border-white/10 shadow-lg lg:max-w-[180px]">
          <img
            src={movie?.poster_url}
            alt={movie?.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{movie?.name}</h2>
            {movie?.origin_name ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                {movie.origin_name}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
            {movie?.year ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.year}
              </span>
            ) : null}
            {statusLabel ? (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">
                {statusLabel}
              </span>
            ) : null}
            {movie?.quality ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.quality}
              </span>
            ) : null}
            {movie?.lang ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.lang}
              </span>
            ) : null}
            {movie?.time ? (
              <span className="rounded-full bg-white/10 px-3 py-1">
                {movie.time}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-200">
            {countryText ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 border border-white/10">
                <Globe2 className="h-4 w-4" />
                {countryText}
              </span>
            ) : null}
            {categoriesText ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 border border-white/10">
                <Star className="h-4 w-4 text-amber-300" />
                {categoriesText}
              </span>
            ) : null}
          </div>

          <div className="text-slate-300 text-sm leading-relaxed space-y-2">
            <div
              dangerouslySetInnerHTML={{
                __html: movie?.content || "Chưa có mô tả.",
              }}
            />
            <div className="inline-flex items-center gap-2 text-emerald-300 text-sm">
              <Info className="h-4 w-4" />
              <Link to={`/movie/${slug}`} className="hover:underline">
                Thông tin phim
              </Link>
            </div>
          </div>

          {notifyText ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
              <Timer className="h-4 w-4" />
              {notifyText}
            </div>
          ) : null}
        </div>
      </div>

      {episodes.length ? (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/15 via-purple-500/10 to-blue-500/15 px-4 py-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1 text-slate-100">
            <p className="text-sm font-semibold">
              {activeEpisode
                ? `Đang xem: ${activeEpisode.name}`
                : "Chọn tập để xem"}
            </p>
            <p className="text-xs text-slate-200/80">
              Tổng cộng {episodes.length} tập, chọn bên dưới.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3" id="episode-list">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 uppercase tracking-[0.14em]">
              Phần 1
            </p>
            <h2 className="text-lg font-semibold text-white">
              Danh sách tập {episodes.length ? `(${episodes.length})` : ""}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ListChecks className="h-4 w-4" />
            <span>Chọn tập để xem</span>
          </div>
        </div>

        {sortedEpisodes.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sortedEpisodes.map((ep, idx) => (
              <Link
                key={ep.slug || ep.name || idx}
                to={`/watch/${slug}?episode=${encodeURIComponent(
                  ep.slug || ep.name || `ep-${idx + 1}`
                )}`}
                className={`group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-emerald-400/60 hover:bg-white/10 ${
                  activeEpisode?.slug === ep.slug
                    ? "border-emerald-400 bg-emerald-500/10"
                    : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-300" />
                  {ep.name || `Tập ${idx + 1}`}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">Chưa có tập.</p>
        )}
      </div>
    </div>
  );
};

export default Watch;
