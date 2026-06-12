import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, BookOpen, Heart, Info, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { comicApi } from "../../api/comicApi";
import { useSavedComic } from "../../hooks/useSavedComic";
import { isMobile } from "../../utils/responsive.js";
import { getOptimizedPoster } from "../../utils/image-helper.js";

const IMAGE_CDN =
  import.meta.env.VITE_COMIC_IMAGE_CDN ||
  "https://img.otruyenapi.com/uploads/comics/";
const fallbackLandscape =
  "https://placehold.co/1280x720/1e293b/a855f7?text=No+Image";

/**
 * ComicCard component for displaying a comic with a frame synchronized with MovieCard.
 */
const ComicCard = ({ comic }) => {
  const cardRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const { isSaved, toggleSave, loading: favLoading } = useSavedComic(comic);

  // Background fetch for chapters to provide direct "Read Now" link
  const { data: detailData } = useQuery({
    queryKey: ["comicDetail", comic?.slug],
    queryFn: () => comicApi.getDetail(comic?.slug),
    enabled: hovered && !!comic?.slug,
    staleTime: 1000 * 60 * 30,
  });

  const fullChapters = detailData?.data?.item?.chapters?.[0]?.server_data || [];
  const firstChapterId = fullChapters.length > 0 ? fullChapters[0].chapter_api_data : null;


  const [alignment, setAlignment] = useState("center");

  const isHoverDevice = useRef(
    typeof window !== "undefined" ? window.matchMedia("(hover: hover)").matches : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover)");
    const handler = (e) => { isHoverDevice.current = e.matches; };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleMouseEnter = (e) => {
    if (!isHoverDevice.current || window.innerWidth < 1024) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const threshold = 160;

    if (center < threshold) {
      setAlignment("left");
    } else if (window.innerWidth - center < threshold) {
      setAlignment("right");
    } else {
      setAlignment("center");
    }
    setHovered(true);
  };

  const thumbUrl = comic.thumb_url?.startsWith("http")
    ? comic.thumb_url
    : `${IMAGE_CDN}${comic.thumb_url}`;

  const isMobileSize = isMobile();
  const posterSrc = getOptimizedPoster(thumbUrl, isMobileSize ? 200 : 360, isMobileSize ? 70 : 80);
  const thumbHoverSrc = getOptimizedPoster(thumbUrl, isMobileSize ? 400 : 640, isMobileSize ? 70 : 80);

  const formatDate = (dateValue) => {
    if (!dateValue) return "Vừa xong";
    try {
      if (dateValue && typeof dateValue.toDate === "function") {
        return dateValue.toDate().toLocaleDateString("vi-VN");
      }
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return "Vừa xong";
      return d.toLocaleDateString("vi-VN");
    } catch {
      return "Vừa xong";
    }
  };

  const latestChapter = comic.chaptersLatest?.[0];

  // Single-pass flatMap avoids creating intermediate array
  const categories = (comic.category || [])
    .slice(0, 3)
    .flatMap((c) => {
      const name = typeof c === "string" ? c : c?.name || "";
      return name ? [name] : [];
    });

  return (
    <div
      ref={cardRef}
      className="mc-wrapper group relative flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/comics/${comic.slug}`} className="relative flex flex-col">
        <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-800 relative shadow-lg lg:group-hover:shadow-purple-500/20 transition-all duration-300">
          <img
            src={posterSrc}
            alt={comic.name || "Comic"}
            className="absolute h-full w-full object-cover transition duration-500 lg:group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const currentSrc = e.currentTarget.src;
              if (currentSrc.includes("wsrv.nl")) {
                e.currentTarget.src = thumbUrl;
              } else if (currentSrc === thumbUrl) {
                e.currentTarget.src =
                  "https://placehold.co/400x600/1e293b/a855f7?text=No+Cover";
              }
            }}
          />

          {/* Status badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 items-end">
            {(!comic.chaptersLatest || comic.chaptersLatest.length === 0) && (
              <div className="px-2 py-0.5 rounded text-[10px] font-bold shadow-lg uppercase backdrop-blur-md bg-orange-500/90 text-white">
                Trailer
              </div>
            )}
            {comic.status &&
              comic.chaptersLatest &&
              comic.chaptersLatest.length > 0 && (
                <div
                  className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-lg uppercase backdrop-blur-md ${
                    comic.status === "completed"
                      ? "bg-emerald-500/90 text-slate-950"
                      : "bg-purple-600/90 text-white"
                  }`}
                >
                  {comic.status === "completed" ? "Full" : "Ongoing"}
                </div>
              )}
          </div>

          {/* Latest chapter badge */}
          {comic.chaptersLatest && comic.chaptersLatest.length > 0 && (
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-bold border border-white/10 text-white z-10 transition-transform lg:group-hover:-translate-y-[2px]">
              CH. {comic.chaptersLatest[0].chapter_name}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </div>

        <div className="mt-4 flex flex-col items-center text-center px-1">
          <h3 className="text-[17px] font-semibold text-white line-clamp-1 lg:group-hover:text-purple-400 transition-colors">
            {comic.name || "Truyện không tên"}
          </h3>
          <p className="text-[15px] font-medium text-slate-400 line-clamp-1 mt-1 flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDate(comic.updatedAt)}
          </p>
        </div>
      </Link>

      {/* Hover Preview */}
      {hovered && (
        <div 
          className={`hc-popup hc-popup--comic ${alignment === "left" ? "hc-popup--left" : alignment === "right" ? "hc-popup--right" : ""}`} 
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* Landscape image */}
          <div className="hc-thumb">
            <img
              src={thumbHoverSrc}
              alt={comic.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackLandscape;
              }}
            />
            <div className="hc-thumb-gradient" />
          </div>

          {/* Body */}
          <div className="hc-body">
            <h3 className="hc-title">{comic.name || "Truyện không tên"}</h3>

            {/* Action row */}
            <div className="hc-actions">
              <Link
                to={firstChapterId ? `/comics/chapter/${encodeURIComponent(firstChapterId)}` : `/comics/${comic.slug}`}
                state={{ chapters: fullChapters, slug: comic.slug, thumb_url: thumbUrl }}
                className="hc-btn-play hc-btn-play--comic"
                onClick={(e) => e.stopPropagation()}
              >
                <BookOpen size={13} />
                Đọc ngay
              </Link>
              
              <button
                type="button"
                className={`hc-icon-btn ${isSaved ? "hc-icon-btn--active" : ""}`}
                aria-label="Yêu thích"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSave();
                }}
                disabled={favLoading}
              >
                <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
              </button>

              <Link
                to={`/comics/${comic.slug}`}
                className="hc-icon-btn"
                aria-label="Chi tiết"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronDown size={18} />
              </Link>
            </div>

            {/* Meta badges */}
            <div className="hc-meta-row">
              <span className="hc-meta-plain">{formatDate(comic.updatedAt)}</span>
              {latestChapter && (
                <span className="hc-meta-badge hc-meta-badge--purple">
                  Ch.{latestChapter.chapter_name}
                </span>
              )}
              {comic.status && (
                <span className={`hc-meta-badge ${comic.status === "completed" ? "hc-meta-badge--green" : "hc-meta-badge--purple"}`}>
                  {comic.status === "completed" ? "Full" : "Ongoing"}
                </span>
              )}
            </div>

            {/* Genres */}
            {categories.length > 0 && (
              <p className="hc-genres hc-genres--comic">
                {categories.join(" • ")}
              </p>
            )}

            {/* Description */}
            {(comic.description || comic.content) && (
              <p className="hc-desc">
                {(comic.description || comic.content).replace(/<[^>]*>/g, "").slice(0, 150)}
                {(comic.description || comic.content).length > 150 ? "…" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


export default ComicCard;
