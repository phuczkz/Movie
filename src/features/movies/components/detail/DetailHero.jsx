import {
  Heart,
  Play,
  ChevronDown,
  Film,
  Star,
  Send,
} from "lucide-react";
import { useState } from "react";
import { getOptimizedImage } from "./detailUtils.js";
import { usePosterFallback } from "@/features/movies/hooks/usePosterFallback.js";
import { useMovieRating } from "@/features/movies/hooks/useMovieRating.js";
import RatingModal from "./RatingModal.jsx";
import ShareButton from '@/components/ShareButton.jsx';

const DetailHero = ({
  movie,
  passedMovie,
  passedPoster,
  passedThumb,
  heroImage,
  slug,
  isMovie,
  isTrailer,
  latestEpisodeNumber,
  epTotal,
  movieOverride,
  episodes,
  selectedServer,
  navigate,
  isSaved,
  saving,
  error,
  toggleSave,
  mobileSection,
  setMobileSection,
}) => {
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const ratingData = useMovieRating(slug, movie?.rating);
  const displayRating = ratingData.average > 0
    ? ratingData.average
    : movie?.rating
    ? Number(movie.rating).toFixed(1)
    : "0";

  const detailBadgeText = (() => {
    const type = movie?.type || "";
    const totalEps = movie?.episode_total ? String(movie.episode_total).trim() : "";
    const currentEps = movie?.episode_current ? String(movie.episode_current).trim() : "";
    
    if (isMovie || type === "single" || type === "phimle") {
      return "Full";
    } else {
      // Series, TV Shows, Hoat Hinh
      const getEpisodeNum = (str) => {
        if (!str) return null;
        const match = String(str).match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const totalNum = getEpisodeNum(totalEps) || (epTotal > 0 ? epTotal : null);
      let currNum = getEpisodeNum(currentEps) || (latestEpisodeNumber >= 0 ? latestEpisodeNumber : null);
      
      const isCompleted = currentEps.toLowerCase().includes("hoàn tất") || currentEps.toLowerCase().includes("full");
      if (currNum === null && isCompleted && totalNum !== null) {
        currNum = totalNum;
      }
      
      if (currNum !== null && totalNum !== null) {
        return `Tập ${currNum}/${totalNum}`;
      } else if (currNum !== null) {
        return `Tập ${currNum}`;
      } else if (totalNum !== null) {
        return `Tập ${totalNum}/${totalNum}`;
      } else {
        if (isCompleted) {
          return "Hoàn Tất";
        } else {
          return currentEps || "Đang Cập Nhật";
        }
      }
    }
  })();

  const showQuality = movie?.quality && movie.quality.toUpperCase() !== "HD";
  const showLang = movie?.lang && movie.lang.toLowerCase() !== "vietsub";
  const heroMovieObj = movie?.name ? movie : (passedMovie || movie);
  const fallbackHeroPoster = getOptimizedImage(
    passedMovie?.poster_url || movie?.poster_url,
    500
  );
  const { posterSrc: heroPosterSrc, handlePosterError: handleHeroPosterError } = usePosterFallback(
    heroMovieObj,
    500,
    85,
    fallbackHeroPoster,
    () => setPosterLoaded(true)
  );

  return (
    <>
      {heroImage ? (
        <div className="relative left-1/2 -translate-x-1/2 mt-[-72px] md:mt-[-96px] lg:mt-[-200px] w-screen max-w-none pointer-events-none">
          {/* Spacer: Giữ nguyên khoảng trống gốc để không đẩy content đi chỗ khác */}
          <div className="aspect-[16/10] md:aspect-[2/1] xl:aspect-[21/9] w-full invisible pointer-events-none" />

          {/* Banner chỉ kéo dài xuống khoảng 25% phía dưới spacer (tương đương 1/3 khung thông tin đầu tiên) */}
          <div className="absolute top-0 left-0 w-full h-[125%] bg-[#0b0b15] z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full">
              {/* Blurred poster placeholder — loads instantly from browser cache */}
              {!bannerLoaded && (passedThumb || passedPoster) && (
                <img
                  src={passedThumb || passedPoster}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-[50%_15%] blur-2xl opacity-40 scale-[1.15]"
                />
              )}
              {!bannerLoaded && !(passedThumb || passedPoster) && (
                <div className="absolute inset-0 bg-slate-900/60 animate-pulse" />
              )}
              <img
                src={getOptimizedImage(heroImage, 1200)}
                alt={movie?.name || "Banner"}
                className={`w-full h-full object-cover object-[50%_15%] transition-opacity duration-700 ease-out ${
                  bannerLoaded ? "opacity-100" : "opacity-0"
                }`}
                fetchPriority="high"
                onLoad={() => setBannerLoaded(true)}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = heroImage;
                  setBannerLoaded(true);
                }}
              />
              {/* Lớp phủ tối ở trên để bảo vệ Header (Search, Menu, Logo) */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#0b0b15] via-[#0b0b15]/40 to-transparent" />

              {/* Lớp phủ tối ở dưới đậm hơn để bảo vệ thông tin phim (Title, Metadata) */}
              <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#0b0b15] via-[#0b0b15]/80 to-transparent" />
            </div>
          </div>
          <div
            className="absolute top-full bottom-[-40%] left-0 w-full bg-slate-950/80 backdrop-blur-[8px] z-0 pointer-events-none"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)",
            }}
          />
        </div>
      ) : null}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-end -mt-24 sm:-mt-32 md:-mt-40 lg:-mt-52 xl:-mt-64 relative z-20">
          <div className="mx-auto lg:mx-0 w-32 sm:w-40 md:w-44 lg:w-64 shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl border-0 lg:border-4 lg:border-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.9)] bg-slate-900 aspect-[2/3] ring-1 ring-white/10 relative z-30 transition-transform duration-500 hover:scale-[1.02]">
            {!posterLoaded && passedPoster && (
              <img
                src={passedPoster}
                className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-50"
                alt=""
              />
            )}
            {!posterLoaded && !passedPoster && (
              <div className="absolute inset-0 bg-slate-800/60 animate-pulse" />
            )}
            <img
              src={heroPosterSrc}
              alt={movie?.name || passedMovie?.name}
              className={`h-full w-full object-cover transition-opacity duration-500 ease-out ${
                posterLoaded ? "opacity-100" : "opacity-0"
              }`}
              fetchPriority="high"
              onLoad={() => setPosterLoaded(true)}
              onError={handleHeroPosterError}
            />
          </div>

          <div className="gap-4 flex-1 w-full lg:pt-4 drop-shadow-2xl flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
              {movie?.name || passedMovie?.name || "Đang tải tên phim..."}
            </h1>
            {movie.origin_name ? (
              <>
                <p className="lg:hidden text-slate-200/80 text-sm font-medium drop-shadow-md">
                  {movie.origin_name}
                </p>
                <p className="hidden lg:block text-slate-100/90 text-sm font-medium drop-shadow-md">
                  Tên gốc: {movie.origin_name}
                </p>
              </>
            ) : null}


            {/* Desktop/Laptop+: giữ layout meta như hiện tại */}
            <div className="hidden lg:flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white font-medium drop-shadow-md">
              {movie?.year && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.year}
                </span>
              )}
              <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                {detailBadgeText}
              </span>

              {showQuality && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.quality}
                </span>
              )}
              {showLang && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.lang}
                </span>
              )}
              {movie?.time && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.time}
                </span>
              )}
              {movie?.country?.length > 0 && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.country.map((c) => c.name || c).join(", ")}
                </span>
              )}
              {movie?.category?.length > 0 && (
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {movie.category.map((c) => c.name || c).join(", ")}
                </span>
              )}
            </div>

            {/* Mobile/Tablet/iPad: meta nằm trong phần xổ xuống giống ảnh */}
            <details className="lg:hidden w-full">
              <summary className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-amber-200 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                Thông tin phim
                <ChevronDown className="size-4" />
              </summary>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-white font-medium">
                {movie?.year && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.year}
                  </span>
                )}
                <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                  {detailBadgeText}
                </span>

                {showQuality && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.quality}
                  </span>
                )}
                {showLang && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.lang}
                  </span>
                )}
                {movie?.time && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.time}
                  </span>
                )}
                {movie?.country?.length > 0 && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.country.map((c) => c.name || c).join(", ")}
                  </span>
                )}
                {movie?.category?.length > 0 && (
                  <span className="rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1">
                    {movie.category.map((c) => c.name || c).join(", ")}
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-3xl border border-white/5 bg-slate-900/60 p-5 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-300">
                    Giới thiệu
                  </p>
                </div>
                <div
                  className="text-slate-300 leading-relaxed text-[15px]"
                  dangerouslySetInnerHTML={{
                    __html: movie.content || "Chưa có mô tả.",
                  }}
                />
              </div>
            </details>

            {/* Desktop Action Group (lg: và lớn hơn) */}
            <div className="hidden lg:flex lg:flex-wrap lg:items-center gap-3 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const serverParam = selectedServer
                    ? `?server=${encodeURIComponent(selectedServer)}`
                    : "";
                  navigate(`/watch/${slug}${serverParam}`);
                }}
                className={`inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:-translate-y-[1px] relative z-30 cursor-pointer ${
                  episodes.length ? "" : "opacity-90"
                }`}
              >
                {movieOverride?.mode === "trailer" || isTrailer ? (
                  <>
                    <Film className="size-4 fill-current" />
                    Xem Trailer
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" />
                    {episodes.length ? "Xem ngay" : "Mở trang xem"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleSave}
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition cursor-pointer relative z-30 ${
                  isSaved
                    ? "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                    : "border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                } ${saving ? "opacity-80" : ""}`}
              >
                <Heart
                  className="size-4"
                  fill={isSaved ? "currentColor" : "none"}
                />
                {saving
                  ? "Đang lưu..."
                  : isSaved
                  ? "Hủy Yêu thích"
                  : "Yêu thích"}
              </button>

              <ShareButton
                title={`${movie?.name || "Phim hay"} - Xem phim online`}
                text={`Xem ${movie?.name || "phim hay"} tại đây!`}
                className="border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
              />

              <button
                type="button"
                onClick={() => setIsRatingModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 px-4 py-3 text-sm font-semibold transition cursor-pointer relative z-30"
                title="Đánh giá phim này"
              >
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <span>Đánh giá ({displayRating})</span>
              </button>
            </div>

            {/* Mobile & Tablet Action Area (Màn hình dưới lg - Thiết kế theo hình tham khảo) */}
            <div className="flex lg:hidden flex-col gap-3.5 w-full pt-1">
              {/* Nút Xem Ngay Full-width màu xanh lá emerald gốc */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const serverParam = selectedServer
                    ? `?server=${encodeURIComponent(selectedServer)}`
                    : "";
                  navigate(`/watch/${slug}${serverParam}`);
                }}
                className={`w-full flex justify-center items-center gap-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 px-6 py-3.5 text-base font-bold shadow-[0_8px_24px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-all cursor-pointer relative z-30 ${
                  episodes.length ? "" : "opacity-90"
                }`}
              >
                {movieOverride?.mode === "trailer" || isTrailer ? (
                  <>
                    <Film className="size-5 fill-current" />
                    <span>Xem Trailer</span>
                  </>
                ) : (
                  <>
                    <Play className="size-5 fill-current" />
                    <span>{episodes.length ? "Xem Ngay" : "Mở trang xem"}</span>
                  </>
                )}
              </button>

              {/* Hàng 3 icon bên dưới: Yêu thích, Chia sẻ và Đánh giá được CĂN GIỮA (center) đều nhau */}
              <div className="flex items-center justify-center gap-8 sm:gap-12 w-full pt-1">
                {/* 1. Nút Yêu thích */}
                <button
                  type="button"
                  onClick={toggleSave}
                  disabled={saving}
                  className="group flex flex-col items-center gap-1 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer relative z-30 min-w-[56px]"
                >
                  <div
                    className={`p-1.5 rounded-full transition-all ${
                      isSaved
                        ? "text-rose-500 bg-rose-500/10"
                        : "text-white/80 group-hover:text-white"
                    }`}
                  >
                    <Heart
                      className={`size-5 transition-transform group-hover:scale-110 ${
                        isSaved ? "scale-110 fill-rose-500 text-rose-500" : ""
                      }`}
                      fill={isSaved ? "currentColor" : "none"}
                      strokeWidth={isSaved ? 0 : 2}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-medium tracking-tight whitespace-nowrap ${
                      isSaved ? "text-rose-400" : "text-slate-300"
                    }`}
                  >
                    {saving ? "Đang lưu..." : isSaved ? "Đã lưu" : "Yêu thích"}
                  </span>
                </button>

                {/* 2. Nút Chia sẻ */}
                <div className="relative z-30 min-w-[56px] flex justify-center">
                  <ShareButton
                    title={`${movie?.name || "Phim hay"} - Xem phim online`}
                    text={`Xem ${movie?.name || "phim hay"} tại đây!`}
                  >
                    <button
                      type="button"
                      className="group flex flex-col items-center gap-1 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                    >
                      <div className="p-1.5 rounded-full text-white/80 group-hover:text-white transition-all">
                        <Send className="size-5 transition-transform group-hover:scale-110 rotate-[-15deg]" />
                      </div>
                      <span className="text-[11px] font-medium tracking-tight text-slate-300 whitespace-nowrap">
                        Chia sẻ
                      </span>
                    </button>
                  </ShareButton>
                </div>

                {/* 3. Nút Đánh giá (Pill xanh cân đối cùng hàng) */}
                <div className="relative z-30 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setIsRatingModalOpen(true)}
                    className="flex items-center gap-2 rounded-full bg-[#2a4db7] hover:bg-[#2543a0] active:bg-[#1f3a8a] text-white px-4 py-2 text-sm font-bold shadow-md shadow-blue-900/40 transition-all active:scale-95 cursor-pointer"
                    aria-label="Mở form đánh giá phim"
                  >
                    <Star className="size-4 fill-white text-white" />
                    <span className="font-mono text-base">{displayRating}</span>
                  </button>
                </div>
              </div>

              {error ? (
                <div className="text-center w-full">
                  <span className="text-xs text-amber-200">
                    {error.message || "Không thể cập nhật Yêu thích."}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Mobile/Tablet/iPad: Tabs dưới 2 nút action */}
            <div className="lg:hidden w-full pt-2">
              <div className="flex w-full rounded-xl border border-white/10 bg-slate-900/40 p-1">
                <button
                  type="button"
                  onClick={() => setMobileSection("episodes")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    mobileSection === "episodes"
                      ? "bg-white/5 text-amber-200"
                      : "text-slate-300 hover:text-slate-100"
                  }`}
                >
                  Tập phim
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSection("actors")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    mobileSection === "actors"
                      ? "bg-white/5 text-amber-200"
                      : "text-slate-300 hover:text-slate-100"
                  }`}
                >
                  Diễn viên
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSection("related")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    mobileSection === "related"
                      ? "bg-white/5 text-amber-200"
                      : "text-slate-300 hover:text-slate-100"
                  }`}
                >
                  Đề xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        movieTitle={movie?.name || passedMovie?.name}
        ratingData={ratingData}
      />
    </>
  );
};

export default DetailHero;
