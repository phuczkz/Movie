import React, { useState, useMemo } from 'react';
import {
    Search,
    Film,
    Sparkles,
    Clock,
    X,
    Tag,
    Tv,
    Info,
    ShieldAlert,
    BookOpen,
    TrendingUp,
    Layers,
    ArrowRight,
    Newspaper
} from 'lucide-react';
import { useKKphimMovies } from '@/features/movies/hooks/useKKphimMovies.js';

// Helper function to strip HTML tags from API content descriptions
const stripHtml = (htmlStr = "") => {
    if (!htmlStr) return "";
    const cleaned = htmlStr.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim();
    return cleaned;
};

const MaintenanceNew = () => {
    // Fetch latest movies from API
    const { data: movies = [], isLoading } = useKKphimMovies("latest");

    // State for active category filter, search query, selected hero index, and detail modal
    const [activeCategory, setActiveCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);
    const [activeMovieModal, setActiveMovieModal] = useState(null);

    // Filtered movies based on category tab & search query (limited to top 5)
    const filteredMovies = useMemo(() => {
        const list = movies.filter((m) => {
            // Search query match
            const matchQuery =
                !searchQuery.trim() ||
                (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (m.origin_name && m.origin_name.toLowerCase().includes(searchQuery.toLowerCase()));

            // Category / Type match
            let matchCat = true;
            if (activeCategory === "series") {
                matchCat = m.type === "series" || (m.episode_total && m.episode_total !== "1");
            } else if (activeCategory === "single") {
                matchCat = m.type === "single" || m.episode_total === "1";
            }

            return matchQuery && matchCat;
        });

        return list.slice(0, 6);
    }, [movies, searchQuery, activeCategory]);

    // Featured Spotlight Movie (Hero)
    const heroMovie = movies[selectedHeroIndex] || movies[0];

    // Image onError fallback handler
    const handleImgError = (e, slug, defaultBanner) => {
        if (!e.target.dataset.fallback) {
            e.target.dataset.fallback = 'true';
            e.target.src = `https://img.ophim.live/uploads/movies/${slug}-thumb.jpg`;
        } else {
            e.target.src = defaultBanner || 'https://placehold.co/1200x675/e2e8f0/475569?text=1KhoPhim+Blog';
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-['Manrope',sans-serif] selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">

            {/* Light Background Subtle Pattern */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-emerald-100/60 via-indigo-50/40 to-transparent blur-3xl opacity-70" />
            </div>

            {/* Main Header & Navbar */}
            <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-slate-200/80 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">

                    {/* Brand Logo */}
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="size-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                            <Newspaper className="size-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                                    Kho<span className="text-emerald-600">Phim</span>
                                </span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                    Blog
                                </span>
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase block mt-0.5">
                                Điểm Tin & Review Điện Ảnh
                            </span>
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="relative max-w-xs sm:max-w-md w-full hidden sm:block">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm bài viết, phim hot, diễn viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100/90 border border-slate-200 rounded-full pl-10 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Quick Info Tag */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1.5 shadow-sm">
                            <BookOpen className="size-3.5 text-emerald-600" />
                            Tin Tức Điện Ảnh
                        </span>
                    </div>

                </div>
            </header>

            {/* Main Container */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                {/* ── HERO FEATURED SPOTLIGHT ARTICLE (WHITE/LIGHT EDITORIAL STYLE) ── */}
                {heroMovie && (
                    <section className="relative rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl group">
                        {/* Background Widescreen Banner Image (Aspect Ratio 16:9 / 21:9) */}
                        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[24/9] overflow-hidden bg-slate-950">
                            <img
                                src={heroMovie.thumb_url || heroMovie.poster_url}
                                alt={heroMovie.name}
                                onError={(e) => handleImgError(e, heroMovie.slug, heroMovie.poster_url)}
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-90"
                            />
                            {/* Radial & Gradient Overlays for optimal readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent w-full md:w-3/4" />
                        </div>

                        {/* Hero Text Content */}
                        <div className="absolute inset-0 p-6 sm:p-10 lg:p-12 flex flex-col justify-end text-white">
                            <div className="max-w-3xl space-y-4">

                                {/* Category & Info Badges */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider shadow-md">
                                        <Sparkles className="size-3" />
                                        Tin Điểm Nhấn Nổi Bật
                                    </span>
                                    {heroMovie.year && (
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md border border-white/20 text-white">
                                            Năm {heroMovie.year}
                                        </span>
                                    )}
                                    {heroMovie.quality && (
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                                            {heroMovie.quality}
                                        </span>
                                    )}
                                    {heroMovie.episode_current && (
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-500/30 border border-teal-300/40 text-teal-200">
                                            {heroMovie.episode_current}
                                        </span>
                                    )}
                                </div>

                                {/* Movie Titles */}
                                <div>
                                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md">
                                        {heroMovie.name}
                                    </h1>
                                    {heroMovie.origin_name && (
                                        <p className="text-sm sm:text-base font-semibold text-emerald-300 mt-1 line-clamp-1">
                                            {heroMovie.origin_name}
                                        </p>
                                    )}
                                </div>

                                {/* Movie Summary Excerpt */}
                                <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 sm:line-clamp-3 leading-relaxed font-medium max-w-2xl">
                                    {stripHtml(heroMovie.content) || "Khám phá bài viết tổng quan chi tiết, các thông tin bên lề, đánh giá nghệ thuật và điểm nổi bật của tác phẩm điện ảnh này."}
                                </p>

                                {/* Actions & Selector */}
                                <div className="pt-2 flex flex-wrap items-center gap-4">
                                    <button
                                        onClick={() => setActiveMovieModal(heroMovie)}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 cursor-pointer active:scale-95"
                                    >
                                        <BookOpen className="size-4" />
                                        Đọc Review Chi Tiết
                                    </button>

                                    {/* Cycle Hero Selector Dots */}
                                    {movies.length > 1 && (
                                        <div className="flex items-center gap-1.5 ml-auto bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/20">
                                            <span className="text-[10px] text-slate-300 font-bold px-2 uppercase">Tin Hot:</span>
                                            {movies.slice(0, 5).map((m, idx) => (
                                                <button
                                                    key={m.slug || idx}
                                                    onClick={() => setSelectedHeroIndex(idx)}
                                                    className={`size-2.5 rounded-full transition-all cursor-pointer ${selectedHeroIndex === idx
                                                        ? 'bg-emerald-400 w-6'
                                                        : 'bg-white/30 hover:bg-white/60'
                                                        }`}
                                                    title={m.name}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </section>
                )}

                {/* ── FILTER TABS & SEARCH BAR (LIGHT THEME) ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar py-1">
                        {[
                            { id: "all", label: "Tất Cả Phim", icon: Layers },
                            { id: "series", label: "Phim Bộ / Drama", icon: Tv },
                            { id: "single", label: "Phim Chiếu Rạp / Phim Lẻ", icon: Film },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeCategory === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveCategory(tab.id)}
                                    className={`inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${isActive
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon className="size-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="text-xs text-slate-500 font-semibold">
                        Hiển thị <span className="text-emerald-700 font-bold">{filteredMovies.length}</span> bài điểm tin phim
                    </div>
                </div>

                {/* ── MAIN BLOG CARDS GRID (WHITE BG + DARK TEXT + HORIZONTAL COVER IMAGES) ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                    {isLoading ? (
                        // Skeleton Loaders
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse shadow-sm">
                                <div className="w-full aspect-video bg-slate-200" />
                                <div className="p-5 space-y-3">
                                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                                    <div className="h-3 bg-slate-100 rounded w-full" />
                                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                                </div>
                            </div>
                        ))
                    ) : filteredMovies.length > 0 ? (
                        filteredMovies.map((movie) => {
                            const cleanDescription = stripHtml(movie.content) || "Bộ phim mang đến những tình tiết hấp dẫn, kịch tính cùng dàn diễn viên xuất sắc. Đọc bài tổng hợp thông tin để khám phá chi tiết...";
                            const horizontalImg = movie.thumb_url || movie.poster_url;

                            return (
                                <article
                                    key={movie.slug}
                                    onClick={() => setActiveMovieModal(movie)}
                                    className="group rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500/60 overflow-hidden transition-all duration-300 flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1"
                                >
                                    <div>
                                        {/* Horizontal Image Cover Container (16:9 Aspect Ratio) */}
                                        <div className="relative w-full aspect-video overflow-hidden bg-slate-100">
                                            <img
                                                src={horizontalImg}
                                                alt={movie.name}
                                                loading="lazy"
                                                onError={(e) => handleImgError(e, movie.slug, movie.poster_url)}
                                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                            />

                                            {/* Top Overlay Badges */}
                                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                                                {movie.quality ? (
                                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider shadow-md">
                                                        {movie.quality}
                                                    </span>
                                                ) : <div />}

                                                {movie.year && (
                                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 shadow-sm">
                                                        {movie.year}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Bottom Episode Pill */}
                                            {movie.episode_current && (
                                                <div className="absolute bottom-2.5 left-3">
                                                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 backdrop-blur-md text-white">
                                                        {movie.episode_current}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Editorial Content Info Area */}
                                        <div className="p-5 space-y-3">
                                            <div>
                                                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 leading-snug">
                                                    {movie.name}
                                                </h3>
                                                {movie.origin_name && (
                                                    <p className="text-xs font-semibold text-slate-500 line-clamp-1 mt-0.5">
                                                        {movie.origin_name}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Description Summary Snippet */}
                                            <p className="text-xs text-slate-600 font-normal line-clamp-3 leading-relaxed">
                                                {cleanDescription}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Card Footer Meta */}
                                    <div className="px-5 pb-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 bg-slate-50/50">
                                        <span className="flex items-center gap-1 text-slate-600">
                                            <Tag className="size-3 text-emerald-600" />
                                            {movie.lang || "Vietsub"}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-emerald-700 group-hover:translate-x-1 transition-all">
                                            Đọc tiếp <ArrowRight className="size-3" />
                                        </span>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
                            <Film className="size-12 mx-auto text-slate-400 animate-bounce" />
                            <p className="text-slate-600 text-sm font-semibold">
                                Không tìm thấy bài viết phù hợp với từ khóa "{searchQuery}"
                            </p>
                            <button
                                onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                                className="text-xs text-emerald-600 font-bold underline cursor-pointer hover:text-emerald-700"
                            >
                                Xóa tìm kiếm
                            </button>
                        </div>
                    )}
                </div>

                {/* ── TOP TRENDING SPOTLIGHT (LIGHT EDITORIAL STYLE) ── */}
                {movies.length > 0 && (
                    <section className="pt-8 border-t border-slate-200 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="size-5 text-emerald-600" />
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                    Điểm Tin Phim Hot Được Đọc Nhiều Nhất
                                </h2>
                            </div>
                            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                                Top 4 phim quan tâm hàng tuần
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {movies.slice(0, 4).map((movie, idx) => (
                                <div
                                    key={`trending-${movie.slug}`}
                                    onClick={() => setActiveMovieModal(movie)}
                                    className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <span className="text-2xl font-black text-slate-300 group-hover:text-emerald-600 transition-colors w-6 text-center">
                                        0{idx + 1}
                                    </span>
                                    <div className="size-14 rounded-xl overflow-hidden shrink-0 bg-slate-100 relative shadow-sm">
                                        <img
                                            src={movie.thumb_url || movie.poster_url}
                                            alt={movie.name}
                                            onError={(e) => handleImgError(e, movie.slug, movie.poster_url)}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-extrabold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                                            {movie.name}
                                        </h4>
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                                            {movie.origin_name || movie.year}
                                        </p>
                                        <span className="inline-block mt-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">
                                            {movie.quality || "HD"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </main>

            {/* ── LIGHT THEME DETAIL PREVIEW MODAL ── */}
            {activeMovieModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div
                        className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto space-y-0 text-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setActiveMovieModal(null)}
                            className="absolute top-4 right-4 z-20 size-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-lg"
                        >
                            <X className="size-5" />
                        </button>

                        {/* Horizontal Banner Image */}
                        <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] overflow-hidden bg-slate-950">
                            <img
                                src={activeMovieModal.thumb_url || activeMovieModal.poster_url}
                                alt={activeMovieModal.name}
                                onError={(e) => handleImgError(e, activeMovieModal.slug, activeMovieModal.poster_url)}
                                className="w-full h-full object-cover brightness-95"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent" />
                        </div>

                        {/* Modal Body Info */}
                        <div className="p-6 sm:p-8 space-y-6 -mt-10 relative z-10">

                            {/* Title & Badges */}
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {activeMovieModal.quality && (
                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white uppercase">
                                            {activeMovieModal.quality}
                                        </span>
                                    )}
                                    {activeMovieModal.year && (
                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                                            Năm {activeMovieModal.year}
                                        </span>
                                    )}
                                    {activeMovieModal.episode_current && (
                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                            {activeMovieModal.episode_current}
                                        </span>
                                    )}
                                </div>

                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                                    {activeMovieModal.name}
                                </h2>
                                {activeMovieModal.origin_name && (
                                    <p className="text-sm font-semibold text-emerald-700">
                                        {activeMovieModal.origin_name}
                                    </p>
                                )}
                            </div>

                            {/* Maintenance Information Banner */}
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900">
                                <Info className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-extrabold text-emerald-950">
                                        Thông tin từ Ban Quản Trị KhoPhim
                                    </p>
                                    <p className="text-slate-700 font-normal leading-relaxed">
                                        Trình phát video đang được tạm dừng để nâng cấp hạ tầng phát sóng. Vui lòng quay lại sau khi quá trình bảo trì hoàn tất để thưởng thức trọn vẹn bộ phim này!
                                    </p>
                                </div>
                            </div>

                            {/* Full Description */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <BookOpen className="size-3.5 text-emerald-600" />
                                    Nội Dung & Đánh Giá Bài Viết
                                </h4>
                                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3 font-normal max-h-60 overflow-y-auto pr-2">
                                    {stripHtml(activeMovieModal.content) || (
                                        <p>
                                            Bộ phim <b>{activeMovieModal.name}</b> ({activeMovieModal.origin_name}) là một trong những tác phẩm nổi bật thu hút sự quan tâm của đông đảo khán giả. Với cốt truyện đặc sắc cùng tạo hình nhân vật ấn tượng, bộ phim hứa hẹn mang lại những trải nghiệm điện ảnh tuyệt vời.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-4 border-t border-slate-200 flex justify-end">
                                <button
                                    onClick={() => setActiveMovieModal(null)}
                                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
                                >
                                    Đóng Bài Viết
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ── FOOTER (LIGHT THEME) ── */}
            <footer className="relative z-10 border-t border-slate-200 py-8 bg-white text-center text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 space-y-3">
                    <div className="flex items-center justify-center gap-2">
                        <div className="size-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs">k</div>
                        <span className="font-extrabold text-slate-900 text-sm">KhoPhim Blog</span>
                    </div>
                    <p>© 2026 1KhoPhim. Chuyên trang thông tin, đánh giá & điểm tin điện ảnh mới nhất.</p>
                </div>
            </footer>

        </div>
    );
};

export default MaintenanceNew;
