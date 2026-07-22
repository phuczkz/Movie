import { Link } from "react-router-dom";
import { User, Info } from "lucide-react";
import { lazy, Suspense } from "react";
import EpisodeList from '@/components/EpisodeList.jsx';
import MovieCard from '@/features/movies/components/MovieCard.jsx';
import SeasonSelector from '@/components/SeasonSelector.jsx';

const Comments = lazy(() => import('@/features/movies/components/Comments.jsx'));

const DetailDesktopContent = ({
  movie, episodes, selectedEpisodes, serverGroups, selectedServer,
  setUserSelectedServer, isMovie, isCompleted, epTotal, upcomingNotice,
  movieOverride, isTmdb, actorsWithImages, relatedMovies, groups,
  currentSeason, hasVietsub, hasLongTieng, hasThuyetMinh,
}) => {
  return (
    <div className="relative z-10 w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 grid gap-x-6 gap-y-6 lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px] lg:grid-rows-[auto_1fr] items-start">
      {/* Cột 1: Giới thiệu (Vị trí 1 trên mọi thiết bị) */}
      <div className="hidden lg:block lg:col-start-1 lg:row-start-1 space-y-6 lg:mb-0">
        <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 lg:p-8 space-y-3 shadow-xl h-full">
          <div className="flex items-center gap-3">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-300">Giới thiệu</p>
          </div>
          {/* oxc-disable-next-line react/no-danger */}
          <div className="text-slate-300 leading-relaxed text-[15px]" dangerouslySetInnerHTML={{ __html: movie.content || "Chưa có mô tả." }} />
        </div>
      </div>

      {/* Cột 2: Sidebar (Episodes, Actors, Related) */}
      <div className="hidden lg:block lg:col-start-2 lg:row-start-1 lg:row-span-2 space-y-6 min-w-0">
        <div className="self-start rounded-3xl border border-white/5 bg-slate-900/70 shadow-xl p-6 lg:p-8 space-y-5">
          {/* Season Selector (Desktop) */}
          {groups && (<SeasonSelector groups={groups} currentSeason={currentSeason} />)}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Tập phim</h2>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                {!isMovie && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1">
                    <span className="text-[11px] uppercase tracking-[0.08em] text-emerald-200">{selectedServer || "Nguồn"}</span>
                    <span className="text-slate-200/80">{selectedEpisodes.length ? `${selectedEpisodes.length}${epTotal ? `/${epTotal}` : ""} tập` : ""}</span>
                  </span>
                )}
                {isCompleted ? (<span className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100">Hoàn tất</span>) : null}
              </div>
            </div>
          </div>

          {Object.keys(serverGroups).length > 1 && !isMovie ? (
            <div className="flex flex-wrap items-center gap-2">
              {hasVietsub ? (<button type="button" onClick={() => setUserSelectedServer("Vietsub")} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${selectedServer === "Vietsub" ? "border-emerald-400/70 bg-emerald-400 text-emerald-950" : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/50 hover:text-emerald-100"}`}>Vietsub</button>) : null}
              {hasLongTieng ? (<button type="button" onClick={() => setUserSelectedServer("Lồng Tiếng")} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${selectedServer === "Lồng Tiếng" ? "border-emerald-400/70 bg-emerald-400 text-emerald-950" : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/50 hover:text-emerald-100"}`}>Lồng Tiếng</button>) : null}
              {hasThuyetMinh ? (<button type="button" onClick={() => setUserSelectedServer("Thuyết Minh")} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${selectedServer === "Thuyết Minh" ? "border-emerald-400/70 bg-emerald-400 text-emerald-950" : "border-white/10 bg-white/5 text-slate-100 hover:border-emerald-400/50 hover:text-emerald-100"}`}>Thuyết Minh</button>) : null}
            </div>
          ) : null}

          {upcomingNotice && (
            <div className="rounded-2xl border border-amber-300/40 bg-amber-500/15 text-amber-100 px-4 py-3 text-sm font-semibold flex items-start gap-3 mb-4 shadow-lg shadow-amber-950/20 backdrop-blur-sm">
              <div className="mt-0.5 text-amber-400">{upcomingNotice.icon}</div>
              <div><div>{upcomingNotice.text}</div></div>
            </div>
          )}

          {movieOverride?.mode === "trailer" ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center space-y-2">
              <div className="flex justify-center"><Info className="size-6 text-amber-400" /></div>
              <p className="text-sm font-semibold text-amber-200">Phim hiện đang chưa có nguồn</p>
              <p className="text-xs text-slate-400 leading-relaxed">Bộ phim này hiện tại chỉ có Trailer. Bạn có thể xem bản giới hạn bằng nút "Xem Trailer" ở trên.</p>
            </div>
          ) : episodes.length ? (
            <div className="max-h-48 overflow-y-auto pr-1">
              <EpisodeList episodes={isMovie ? episodes : selectedEpisodes} serverLabel={isMovie ? undefined : selectedServer || undefined} showServerLabels={isMovie} />
            </div>
          ) : (
            <p className="text-slate-400">{isTmdb ? "Nguồn TMDB chưa có tập phát online." : "Chưa có tập."}</p>
          )}
        </div>

        {actorsWithImages.length ? (
          <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-sm uppercase tracking-[0.14em] text-slate-300">Diễn viên</p>
              <span className="text-xs font-semibold text-slate-400">{actorsWithImages.length}</span>
            </div>
            <div className="flex overflow-x-auto gap-4 md:gap-6 pb-2 snap-x custom-scrollbar">
              {actorsWithImages.map((actor) => (
                <Link key={actor.name} to={`/actor/${actor.id || actor.name}`} className="flex flex-col items-center gap-2 min-w-[80px] sm:min-w-[96px] snap-start group/actor hover:-translate-y-1 transition-transform">
                  <div className="size-14 sm:size-16 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-lg group-hover/actor:border-emerald-500/50 group-hover/actor:shadow-emerald-500/20 transition-all flex items-center justify-center">
                    {actor.image ? (<img src={actor.image} alt={actor.name} className="h-full w-full object-cover group-hover/actor:scale-110 transition-transform duration-500" loading="lazy" />) : (<User className="size-1/2 text-slate-400 group-hover/actor:text-emerald-400/80 transition-colors" />)}
                  </div>
                  <span className="text-center text-xs sm:text-sm text-slate-100 line-clamp-2 leading-tight group-hover/actor:text-emerald-400 transition-colors">{actor.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {relatedMovies.length > 0 && (
          <div className="rounded-3xl border border-white/5 bg-slate-900/60 shadow-xl p-6 lg:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <p className="text-sm uppercase tracking-[0.14em] text-slate-300">Phim liên quan</p>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
              {relatedMovies.map((relMovie) => (
                <div key={relMovie.slug} className="min-w-[170px] sm:min-w-[200px] snap-start">
                  <MovieCard movie={relMovie} suppressHover={true} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cột 1 hàng 2: Bình luận */}
      <div className="hidden lg:block lg:col-start-1 lg:row-start-2">
        {movie && movie.slug && (
          <Suspense fallback={<div className="text-slate-400 text-sm">Đang tải bình luận...</div>}>
            <Comments movieSlug={movie.slug} movieName={movie.name} />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default DetailDesktopContent;
