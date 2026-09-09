import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Heart, Info, ChevronRight, ChevronLeft, ArrowLeft, ArrowRight } from "lucide-react";
/* eslint-disable no-unused-vars */
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
/* eslint-enable no-unused-vars */
import { useMovieDetail } from "@/features/movies/hooks/useMovieDetail.js";
import { useSavedMovie } from "@/features/movies/hooks/useSavedMovie.js";
import { getOptimizedBanner, getOptimizedPoster } from "@/utils/image-helper.js";

const fallbackImage = "https://placehold.co/1280x720/0f172a/94a3b8?text=Anime";

const stripHtml = (html = "") => {
    if (!html) return "";
    return html
        .replace(/<[^>]*>?/gm, "")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .trim();
};

const CardStackItem = ({
    displayMovie,
    backdropSrc,
    rating,
    yearLabel,
    timeLabel,
    categories,
    description,
    dragDirection,
    handleNext,
    handlePrev,
    navigate,
}) => {
    const isDraggingRef = useRef(false);
    const x = useMotionValue(0);
    // Dynamic tilt rotation: ngón tay kéo sang trái thì thẻ nghiêng trái, kéo sang phải nghiêng phải
    const rotate = useTransform(x, [-240, 0, 240], [-8, 0, 8]);

    const cardVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 80 : -80,
            opacity: 0,
            scale: 0.98,
            zIndex: 25,
        }),
        center: {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            zIndex: 30,
            transition: {
                type: "spring",
                stiffness: 350,
                damping: 30,
                mass: 0.8,
            },
        },
        exit: (direction) => ({
            x: direction > 0 ? -280 : 280,
            opacity: 0,
            scale: 0.95,
            zIndex: 35,
            transition: {
                duration: 0.25,
                ease: [0.32, 0.72, 0, 1],
            },
        }),
    };

    return (
        <motion.div
            custom={dragDirection}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            style={{ x, rotate }}
            onDragStart={() => {
                isDraggingRef.current = true;
            }}
            onDragEnd={(e, { offset, velocity }) => {
                setTimeout(() => {
                    isDraggingRef.current = false;
                }, 80);

                const swipeThreshold = 40;
                const velocityThreshold = 300;
                if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
                    handleNext();
                } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
                    handlePrev();
                }
            }}
            onClick={() => {
                if (!isDraggingRef.current && displayMovie?.slug) {
                    navigate(`/movie/${displayMovie.slug}`);
                }
            }}
            className="group/card col-start-1 row-start-1 relative w-full rounded-[28px] bg-[#1f2635] border border-white/15 shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing flex flex-col select-none touch-pan-y"
        >
            {/* 1. Horizontal Banner Image */}
            <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-slate-900 rounded-t-[28px] flex-shrink-0">
                <img
                    src={backdropSrc}
                    alt={displayMovie?.name || "Anime"}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover/card:scale-105 filter brightness-105"
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackImage;
                    }}
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1f2635] via-[#1f2635]/65 to-transparent pointer-events-none" />
            </div>

            {/* 2. Card Body Info */}
            <div className="p-4 sm:p-5 flex flex-col justify-between flex-grow space-y-2.5">
                <div className="space-y-0.5">
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug line-clamp-2 drop-shadow-sm group-hover/card:text-emerald-400 transition-colors">
                        {displayMovie?.name}
                    </h3>
                    {displayMovie?.origin_name && (
                        <p className="text-xs sm:text-sm font-medium text-[#f59e0b] line-clamp-1">
                            {displayMovie.origin_name}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold pt-0.5">
                    <div className="flex items-center gap-1 rounded border border-amber-400/60 bg-black/40 px-2 py-0.5 text-amber-400 shadow-sm">
                        <span className="font-extrabold text-[11px] text-amber-400">IMDb</span>
                        <span className="text-white font-medium">{rating}</span>
                    </div>

                    <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-white/90 text-[11px]">
                        {yearLabel}
                    </span>

                    <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-white/90 text-[11px]">
                        {timeLabel}
                    </span>

                    {categories.slice(0, 3).map((cat) => (
                        <span
                            key={cat}
                            className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90 border border-white/10"
                        >
                            {cat}
                        </span>
                    ))}
                </div>

                <div className="pt-2 border-t border-white/10">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-3 font-normal">
                        {description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

const AnimeShowcase = ({ movies = [], loading = false }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [dragDirection, setDragDirection] = useState(0);
    const isTransitioningRef = useRef(false);
    const navigate = useNavigate();

    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const totalMovies = movies.length;
    const activeMovie = movies[activeIndex] || movies[0];

    // Fetch detail for selected movie
    const { data: detailData } = useMovieDetail(activeMovie?.slug);
    const displayMovie = detailData?.movie || activeMovie;

    const { isSaved, toggleSave, loading: favLoading } = useSavedMovie(
        displayMovie || activeMovie
    );

    const handleNext = useCallback(() => {
        if (!totalMovies || isTransitioningRef.current) return;
        isTransitioningRef.current = true;
        setDragDirection(1);
        setActiveIndex((prev) => (prev + 1) % totalMovies);
        setTimeout(() => {
            isTransitioningRef.current = false;
        }, 280);
    }, [totalMovies]);

    const handlePrev = useCallback(() => {
        if (!totalMovies || isTransitioningRef.current) return;
        isTransitioningRef.current = true;
        setDragDirection(-1);
        setActiveIndex((prev) => (prev - 1 + totalMovies) % totalMovies);
        setTimeout(() => {
            isTransitioningRef.current = false;
        }, 280);
    }, [totalMovies]);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const isOverflowing = el.scrollWidth > el.clientWidth + 8;
        setCanScrollLeft(isOverflowing && el.scrollLeft > 10);
        setCanScrollRight(
            isOverflowing && el.scrollLeft + el.clientWidth < el.scrollWidth - 12
        );
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const initTimer = setTimeout(checkScroll, 0);
        const timer = setTimeout(checkScroll, 300);

        const handleResize = () => checkScroll();
        window.addEventListener("resize", handleResize);
        el.addEventListener("scroll", checkScroll, { passive: true });

        let ro;
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(() => checkScroll());
            ro.observe(el);
        }

        return () => {
            clearTimeout(initTimer);
            clearTimeout(timer);
            window.removeEventListener("resize", handleResize);
            el.removeEventListener("scroll", checkScroll);
            if (ro) ro.disconnect();
        };
    }, [movies]);

    const scrollThumbnails = (direction) => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.6;
        el.scrollBy({
            left: direction === "right" ? amount : -amount,
            behavior: "smooth",
        });
    };

    if (loading) {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Kho Tàng Anime Mới Nhất
                    </h2>
                    <div className="size-7 rounded-full border border-white/20 flex items-center justify-center text-white/70">
                        <ChevronRight className="size-4" />
                    </div>
                </div>
                {/* Desktop skeleton */}
                <div className="hidden xl:block w-full h-[400px] sm:h-[380px] rounded-[28px] bg-[#1f2635] border border-white/10 animate-pulse" />
                {/* Mobile & Tablet skeleton */}
                <div className="block xl:hidden space-y-4">
                    <div className="w-full h-[390px] sm:h-[420px] rounded-[28px] bg-[#1f2635] border border-white/10 overflow-hidden animate-pulse flex flex-col">
                        <div className="w-full h-44 sm:h-48 bg-white/5" />
                        <div className="p-4 sm:p-5 space-y-3 flex-1">
                            <div className="w-3/4 h-5 bg-white/10 rounded" />
                            <div className="w-1/2 h-3 bg-white/5 rounded" />
                            <div className="flex gap-2">
                                <div className="w-12 h-5 bg-white/10 rounded" />
                                <div className="w-12 h-5 bg-white/10 rounded" />
                                <div className="w-16 h-5 bg-white/10 rounded" />
                            </div>
                            <div className="w-full h-12 bg-white/5 rounded pt-2" />
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 pt-1">
                        <div className="size-11 rounded-full bg-white/10 animate-pulse" />
                        <div className="w-28 h-3 rounded-full bg-white/10 animate-pulse" />
                        <div className="size-11 rounded-full bg-white/10 animate-pulse" />
                    </div>
                </div>
            </section>
        );
    }

    if (!movies || movies.length === 0) return null;

    const rawBackdrop =
        displayMovie?.backdrop_url ||
        displayMovie?.thumb_url ||
        displayMovie?.poster_url ||
        fallbackImage;

    const backdropSrc = getOptimizedBanner(rawBackdrop, 1280, 85);

    const categories = (displayMovie?.category || [])
        .flatMap((c) => {
            const name = typeof c === "string" ? c : c?.name || "";
            return name ? [name] : [];
        })
        .slice(0, 5);

    const rating =
        displayMovie?.tmdb?.vote_average?.toFixed(1) ||
        displayMovie?.vote_average?.toFixed(1) ||
        displayMovie?.rating ||
        "6.6";

    const description =
        stripHtml(displayMovie?.content) ||
        stripHtml(displayMovie?.description) ||
        "Bộ phim hoạt hình đặc sắc với cốt truyện lôi cuốn, hình ảnh ấn tượng và dàn nhân vật được yêu thích...";

    const timeLabel = displayMovie?.time || displayMovie?.episode_current || "1h 30m";
    const yearLabel = displayMovie?.year || "2026";
    const ageLabel = displayMovie?.quality || "T16";

    // Data for stacked cards peeking from underneath
    const nextMovie1 = totalMovies > 1 ? movies[(activeIndex + 1) % totalMovies] : null;
    const nextMovie2 = totalMovies > 2 ? movies[(activeIndex + 2) % totalMovies] : null;

    const rawBackdrop1 =
        nextMovie1?.backdrop_url ||
        nextMovie1?.thumb_url ||
        nextMovie1?.poster_url ||
        fallbackImage;
    const backdropSrc1 = getOptimizedBanner(rawBackdrop1, 640, 80);

    const rawBackdrop2 =
        nextMovie2?.backdrop_url ||
        nextMovie2?.thumb_url ||
        nextMovie2?.poster_url ||
        fallbackImage;
    const backdropSrc2 = getOptimizedBanner(rawBackdrop2, 640, 80);

    // Sliding window of 5 indicator dots (matching the 5 dots in design image)
    const maxVisibleDots = Math.min(5, totalMovies);
    let startDot = Math.max(0, Math.min(activeIndex - Math.floor(maxVisibleDots / 2), totalMovies - maxVisibleDots));
    let endDot = Math.min(totalMovies, startDot + maxVisibleDots);
    if (endDot - startDot < maxVisibleDots) {
        startDot = Math.max(0, endDot - maxVisibleDots);
    }
    const visibleDots = Array.from({ length: endDot - startDot }, (_, i) => startDot + i);

    return (
        <section className="space-y-3 sm:space-y-4">
            {/* Header with Title & Arrow */}
            <div className="flex items-center justify-between">
                <Link
                    to="/category/hoat-hinh"
                    className="group inline-flex items-center gap-2.5"
                >
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                        Kho Tàng Anime Mới Nhất
                    </h2>
                    <div className="size-6 sm:size-7 rounded-full border border-white/30 group-hover:border-emerald-400 flex items-center justify-center text-white group-hover:text-emerald-400 transition-colors">
                        <ChevronRight className="size-4" />
                    </div>
                </Link>
            </div>

            {/* ========================================================= */}
            {/* MOBILE & TABLET: CardStack Design Layout                  */}
            {/* ========================================================= */}
            <div className="block xl:hidden relative w-full pt-1 pb-2">
                {/* Ambient glow background */}
                <div className="absolute -inset-x-2 -inset-y-4 bg-gradient-to-tr from-emerald-500/15 via-transparent to-teal-500/10 rounded-[36px] blur-3xl pointer-events-none -z-10" />

                {/* Card Stack Container: Full width matching other components, with right allowance for rotation */}
                <div className="relative w-full pr-3.5 sm:pr-4 grid grid-cols-1">
                    {/* Layer 2 (Bottom-most card behind) */}
                    {nextMovie2 && (
                        <div
                            className="col-start-1 row-start-1 w-full h-full rounded-[28px] bg-[#1a2232] border border-white/15 shadow-md pointer-events-none origin-bottom-left overflow-hidden flex flex-col transition-all duration-300"
                            style={{
                                transform: "translateY(22px) rotate(2.8deg)",
                                zIndex: 10,
                            }}
                        >
                            <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-slate-900/80 rounded-t-[28px] flex-shrink-0">
                                <img
                                    src={backdropSrc2}
                                    alt=""
                                    className="w-full h-full object-cover object-center opacity-60"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = fallbackImage;
                                    }}
                                />
                                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#1a2232] to-transparent" />
                            </div>
                            <div className="flex-1 bg-[#1a2232]" />
                        </div>
                    )}

                    {/* Layer 1 (Middle card behind) */}
                    {nextMovie1 && (
                        <div
                            className="col-start-1 row-start-1 w-full h-full rounded-[28px] bg-[#242e42] border border-white/20 shadow-lg pointer-events-none origin-bottom-left overflow-hidden flex flex-col transition-all duration-300"
                            style={{
                                transform: "translateY(11px) rotate(1.4deg)",
                                zIndex: 20,
                            }}
                        >
                            <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-slate-900/80 rounded-t-[28px] flex-shrink-0">
                                <img
                                    src={backdropSrc1}
                                    alt=""
                                    className="w-full h-full object-cover object-center opacity-75"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = fallbackImage;
                                    }}
                                />
                                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#242e42] to-transparent" />
                            </div>

                            {/* 2. Skeleton Loader Placeholder for Peek UX */}
                            <div className="p-4 sm:p-5 flex flex-col justify-between flex-grow space-y-3 animate-pulse opacity-70">
                                {/* Titles Skeleton */}
                                <div className="space-y-1.5">
                                    <div className="h-5 sm:h-6 w-3/4 bg-white/15 rounded-md" />
                                    <div className="h-3.5 w-2/5 bg-amber-400/20 rounded-md" />
                                </div>

                                {/* Badges Skeleton */}
                                <div className="flex items-center gap-2 pt-0.5">
                                    <div className="h-5 w-14 rounded bg-amber-400/25 border border-amber-400/30" />
                                    <div className="h-5 w-12 rounded bg-white/15 border border-white/10" />
                                    <div className="h-5 w-14 rounded bg-white/15 border border-white/10" />
                                    <div className="h-5 w-16 rounded-md bg-white/10" />
                                </div>

                                {/* Synopsis Skeleton */}
                                <div className="pt-2 border-t border-white/10 space-y-1.5">
                                    <div className="h-3 w-full bg-white/10 rounded" />
                                    <div className="h-3 w-4/5 bg-white/10 rounded" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Layer 0 (Top Active Card with dynamic tilt physics) */}
                    <AnimatePresence initial={false} custom={dragDirection}>
                        <CardStackItem
                            key={displayMovie?.slug || activeIndex}
                            displayMovie={displayMovie}
                            backdropSrc={backdropSrc}
                            rating={rating}
                            yearLabel={yearLabel}
                            timeLabel={timeLabel}
                            categories={categories}
                            description={description}
                            dragDirection={dragDirection}
                            handleNext={handleNext}
                            handlePrev={handlePrev}
                            navigate={navigate}
                        />
                    </AnimatePresence>
                </div>

                {/* Bottom Navigation Controls (matching illustration) */}
                <div className="relative z-40 flex items-center justify-center gap-4 sm:gap-5 mt-9 sm:mt-11">
                    {/* Prev Circular Button */}
                    <button
                        type="button"
                        onClick={handlePrev}
                        aria-label="Thẻ trước"
                        className="size-11 sm:size-12 rounded-full bg-white text-slate-900 shadow-md shadow-black/25 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all duration-200 focus:outline-none"
                    >
                        <ArrowLeft className="size-5 text-slate-900 stroke-[2.2]" />
                    </button>

                    {/* Pagination Indicators with touch-friendly hit areas */}
                    <div className="flex items-center gap-1 sm:gap-1.5 px-1">
                        {visibleDots.map((dotIdx) => {
                            const isActive = dotIdx === activeIndex;
                            return (
                                <button
                                    key={dotIdx}
                                    type="button"
                                    onClick={() => {
                                        if (isTransitioningRef.current || dotIdx === activeIndex) return;
                                        setDragDirection(dotIdx > activeIndex ? 1 : -1);
                                        setActiveIndex(dotIdx);
                                    }}
                                    aria-label={`Đi tới thẻ ${dotIdx + 1}`}
                                    className="min-w-[24px] sm:min-w-[28px] min-h-[36px] flex items-center justify-center focus:outline-none"
                                >
                                    <span
                                        className={`block transition-all duration-300 ${
                                            isActive
                                                ? "w-7 h-2.5 rounded-full bg-white shadow-sm"
                                                : "size-2 rounded-full bg-white/30 hover:bg-white/60"
                                        }`}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    {/* Next Circular Button */}
                    <button
                        type="button"
                        onClick={handleNext}
                        aria-label="Thẻ tiếp theo"
                        className="size-11 sm:size-12 rounded-full bg-white text-slate-900 shadow-md shadow-black/25 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all duration-200 focus:outline-none"
                    >
                        <ArrowRight className="size-5 text-slate-900 stroke-[2.2]" />
                    </button>
                </div>
            </div>

            {/* ========================================================= */}
            {/* DESKTOP ONLY: Full Showcase View with Posters & Actions  */}
            {/* ========================================================= */}
            <div className="hidden xl:block relative w-full rounded-[24px] sm:rounded-[28px] border border-white/10 bg-[#1f2635] shadow-2xl mb-10 sm:mb-12">

                {/* Top Preview Block */}
                <div className="relative min-h-[380px] sm:min-h-[350px] md:min-h-[340px] lg:min-h-[360px] pb-14 sm:pb-14 md:pb-14 flex flex-col md:flex-row items-stretch overflow-hidden rounded-[24px] sm:rounded-[28px]">

                    {/* Right Side Banner Image */}
                    <div className="relative w-full md:w-[50%] lg:w-[55%] h-48 md:h-auto md:absolute md:right-0 md:top-0 md:bottom-0 overflow-hidden order-1 md:order-2 pointer-events-none">
                        <img
                            key={displayMovie?.slug}
                            src={backdropSrc}
                            alt={displayMovie?.name}
                            className="h-full w-full object-cover object-center filter brightness-105"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = fallbackImage;
                            }}
                        />
                        {/* Horizontal gradient overlay blending left edge into medium slate gray */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1f2635] via-[#1f2635]/60 to-transparent w-full md:w-2/5 z-10 hidden md:block" />
                        {/* Mobile Vertical gradient overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1f2635] via-[#1f2635]/80 to-transparent z-10 md:hidden" />
                    </div>

                    {/* Left Side Info Area */}
                    <div className="relative z-20 w-full md:w-[58%] lg:w-[54%] p-4 sm:p-6 md:p-8 space-y-2.5 order-2 md:order-1 flex flex-col justify-start pt-4 sm:pt-6 md:pt-7">
                        {/* Title & Subtitle */}
                        <div className="space-y-0.5">
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md line-clamp-2">
                                {displayMovie?.name}
                            </h3>
                            {displayMovie?.origin_name && (
                                <p className="text-xs sm:text-sm font-medium text-[#f59e0b] line-clamp-1">
                                    {displayMovie.origin_name}
                                </p>
                            )}
                        </div>

                        {/* Badges line: IMDb | Age | Year | Duration */}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold pt-0.5">
                            {/* IMDb Badge */}
                            <div className="flex items-center gap-1 rounded border border-amber-400/60 bg-black/40 px-2 py-0.5 text-amber-400 shadow-sm">
                                <span className="font-extrabold text-[11px] text-amber-400">IMDb</span>
                                <span className="text-white font-medium">{rating}</span>
                            </div>

                            {/* Age / Quality Badge */}
                            <span className="rounded border border-white/30 bg-white/10 px-2.5 py-0.5 text-white">
                                {ageLabel}
                            </span>

                            {/* Year Badge */}
                            <span className="rounded border border-white/30 bg-white/10 px-2.5 py-0.5 text-white">
                                {yearLabel}
                            </span>

                            {/* Duration Badge */}
                            <span className="rounded border border-white/30 bg-white/10 px-2.5 py-0.5 text-white">
                                {timeLabel}
                            </span>
                        </div>

                        {/* Genre Pills */}
                        {categories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {categories.map((cat) => (
                                    <span
                                        key={cat}
                                        className="rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white border border-white/15"
                                    >
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-white/95 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-xl font-normal pt-0.5 drop-shadow-sm">
                            {description}
                        </p>

                        {/* Action Buttons Row: Green Play Button + Pill (Heart | Info Icon) */}
                        <div className="flex items-center gap-3 pt-1.5 pb-1 md:pb-0">
                            {/* Green Play Button */}
                            <Link
                                to={`/watch/${displayMovie?.slug}`}
                                title="Xem ngay"
                                className="flex items-center justify-center size-11 sm:size-12 rounded-full bg-[rgb(16,185,129)] hover:bg-[rgb(16,185,129)]/90 text-slate-950 shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
                            >
                                <Play className="size-5 sm:size-6 fill-slate-950 text-slate-950 translate-x-0.5" />
                            </Link>

                            {/* Pill Block for Favorite Heart & Info Icon */}
                            <div className="flex items-center rounded-full border border-white/20 bg-white/15 backdrop-blur-md px-3.5 py-2 gap-3.5">
                                {/* Heart Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleSave();
                                    }}
                                    disabled={favLoading}
                                    title={isSaved ? "Xóa khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
                                    className="flex items-center justify-center text-white hover:text-rose-400 transition duration-200 disabled:opacity-50 group/fav"
                                >
                                    <Heart
                                        className={`size-4.5 sm:size-5 transition-all duration-300 ${isSaved
                                            ? "text-rose-500 fill-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)] scale-110"
                                            : "text-white fill-white group-hover/fav:scale-110"
                                            }`}
                                    />
                                </button>

                                {/* Divider */}
                                <div className="h-4 w-px bg-white/25" />

                                {/* Info Button with Lucide Info Icon */}
                                <Link
                                    to={`/movie/${displayMovie?.slug}`}
                                    state={{ movie: displayMovie }}
                                    title="Thông tin chi tiết"
                                    className="flex items-center justify-center text-white hover:text-emerald-300 transition duration-200 group/info"
                                >
                                    <Info className="size-4.5 sm:size-5 text-white transition-transform duration-300 group-hover/info:scale-110" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Overlapping Poster Carousel Row */}
                <div className="absolute bottom-0 translate-y-1/2 inset-x-0 z-30 px-3.5 sm:px-7">
                    <div className="relative group/carousel">
                        {/* Left Arrow */}
                        {canScrollLeft && (
                            <button
                                type="button"
                                onClick={() => scrollThumbnails("left")}
                                className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-40 items-center justify-center size-8 rounded-full bg-slate-950/90 border border-white/20 text-white backdrop-blur-md hover:bg-slate-950 transition-opacity shadow-lg"
                                aria-label="Cuộn trái"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                        )}

                        {/* Thumbnails Container - Automatically centered when all posters fit */}
                        <div
                            ref={scrollRef}
                            className={`flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1 ${!canScrollLeft && !canScrollRight
                                ? "justify-center"
                                : "justify-start"
                                }`}
                        >
                            {movies.map((mItem, idx) => {
                                const isActive = idx === activeIndex;
                                const posterUrl = getOptimizedPoster(
                                    mItem.poster_url || mItem.thumb_url,
                                    140,
                                    85
                                );

                                return (
                                    <button
                                        key={mItem.slug || idx}
                                        type="button"
                                        onClick={() => setActiveIndex(idx)}
                                        className={`group relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300 focus:outline-none shadow-md ${isActive
                                            ? "w-[68px] sm:w-[76px] md:w-[82px] aspect-[2/3] border-2 border-white ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)] -translate-y-1 z-10"
                                            : "w-[58px] sm:w-[66px] md:w-[72px] aspect-[2/3] border border-white/20 opacity-90 hover:opacity-100 hover:border-white/50 hover:-translate-y-0.5"
                                            }`}
                                    >
                                        <img
                                            src={posterUrl}
                                            alt={mItem.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = fallbackImage;
                                            }}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Arrow */}
                        {canScrollRight && (
                            <button
                                type="button"
                                onClick={() => scrollThumbnails("right")}
                                className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-40 items-center justify-center size-8 rounded-full bg-slate-950/90 border border-white/20 text-white backdrop-blur-md hover:bg-slate-950 transition-opacity shadow-lg"
                                aria-label="Cuộn phải"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AnimeShowcase;
