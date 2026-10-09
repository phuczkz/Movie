import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePersonDetail } from '@/features/movies/hooks/usePersonDetail';
import MovieCard from '@/features/movies/components/MovieCard';
import MovieCardSkeleton from '@/features/movies/components/MovieCardSkeleton';
import {
  MoveLeft,
  User,
  MapPin,
  Calendar,
  Film,
  Clapperboard,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Columns3,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import SEO from '@/components/SEO.jsx';

const formatBirthdayAndAge = (birthday, deathday) => {
  if (!birthday) return null;
  try {
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const m = endDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }
    const formattedDate = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(birthDate);

    if (deathday) {
      return `${formattedDate} (Mất năm ${age} tuổi)`;
    }
    return `${formattedDate} (${age} tuổi)`;
  } catch {
    return birthday;
  }
};

const translateDepartment = (dept) => {
  if (!dept) return null;
  const d = dept.toLowerCase();
  if (d.includes("acting")) return "Diễn xuất";
  if (d.includes("directing")) return "Đạo diễn";
  if (d.includes("writing")) return "Biên kịch";
  if (d.includes("production")) return "Sản xuất";
  if (d.includes("crew")) return "Đoàn phim";
  return dept;
};

const Actor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: person, isLoading } = usePersonDetail(id);

  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'movie' | 'tv'
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'carousel'
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const carouselRef = useRef(null);

  // Statistics for tabs
  const { movieCount, tvCount, totalCount } = useMemo(() => {
    const credits = person?.credits || [];
    let movies = 0;
    let tvs = 0;
    credits.forEach((c) => {
      if (c.origin_type === "tv" || c.slug?.includes("-tv-")) {
        tvs++;
      } else {
        movies++;
      }
    });
    return { movieCount: movies, tvCount: tvs, totalCount: credits.length };
  }, [person?.credits]);

  // Filter credits based on tab and search keyword
  const filteredCredits = useMemo(() => {
    let list = person?.credits || [];

    if (activeTab === "movie") {
      list = list.filter(
        (m) => m.origin_type === "movie" || m.slug?.includes("-movie-")
      );
    } else if (activeTab === "tv") {
      list = list.filter(
        (m) => m.origin_type === "tv" || m.slug?.includes("-tv-")
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        const nameMatch = m.name && m.name.toLowerCase().includes(q);
        const originMatch =
          m.origin_name && m.origin_name.toLowerCase().includes(q);
        return nameMatch || originMatch;
      });
    }

    return list;
  }, [person?.credits, activeTab, searchQuery]);

  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const scrollAmount = direction === "left" ? -480 : 480;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-pulse">
        {/* Back button skeleton */}
        <div className="hidden lg:block h-8 w-28 rounded-full bg-slate-800" />

        {/* Profile Skeleton */}
        <div className="space-y-6">
          <div className="flex gap-4 sm:gap-6 md:gap-8 items-start">
            <div className="w-28 sm:w-32 md:w-36 lg:w-44 xl:w-48 aspect-[2/3] rounded-2xl bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="h-7 sm:h-9 w-2/3 rounded-lg bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-800" />
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="h-7 w-28 rounded-full bg-slate-800" />
                <div className="h-7 w-32 rounded-full bg-slate-800" />
                <div className="h-7 w-24 rounded-full bg-slate-800" />
                <div className="h-7 w-20 rounded-full bg-slate-800" />
              </div>
            </div>
          </div>
          <div className="pt-5 border-t border-white/5 space-y-2">
            <div className="h-5 w-24 rounded bg-slate-800" />
            <div className="h-4 w-full rounded bg-slate-800" />
            <div className="h-4 w-5/6 rounded bg-slate-800" />
            <div className="h-4 w-4/6 rounded bg-slate-800" />
          </div>
        </div>

        {/* Filmography Skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-48 rounded bg-slate-800" />
          <div className="grid-movies">
            {Array.from({ length: 14 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error / Not Found state
  if (!person || !person.name) {
    return (
      <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center space-y-6">
        <div className="size-20 mx-auto rounded-3xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-500 shadow-xl">
          <User className="size-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Không tìm thấy thông tin diễn viên
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Hệ thống không tìm thấy dữ liệu cho diễn viên này hoặc đường dẫn không còn tồn tại.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 font-medium text-sm transition-all shadow-sm"
        >
          <MoveLeft size={16} />
          Quay lại trang trước
        </button>
      </div>
    );
  }

  const birthdayText = formatBirthdayAndAge(person.birthday, person.deathday);
  const departmentText = translateDepartment(person.known_for_department);

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-8 sm:space-y-10 lg:space-y-12">
      <SEO
        title={`Tuyển tập phim của diễn viên ${person.name}`}
        description={
          person.biography
            ? person.biography.substring(0, 160)
            : `Khám phá toàn bộ phim và tiểu sử của diễn viên ${person.name}.`
        }
        image={person.profile_path}
        type="profile"
      />

      {/* Top back navigation (chỉ hiển thị trên Desktop/Laptop) */}
      <div className="hidden lg:block">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-white/10 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10 text-xs sm:text-sm font-medium transition-all group backdrop-blur-md shadow-sm"
        >
          <MoveLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Quay lại
        </button>
      </div>

      {/* ─── Actor Profile Hero ─── */}
      <section className="space-y-6 sm:space-y-7">
        {/* ─── Khối chính: Avatar và Thông tin ─── */}
        <div className="flex gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* Bên trái: Avatar khống chế tỉ lệ chuẩn, không bị phóng to quá đà trên màn hình lớn */}
          <div className="w-28 sm:w-32 md:w-36 lg:w-44 xl:w-48 aspect-[2/3] shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.5)] border border-white/15 bg-slate-950 group relative">
            {person.profile_path ? (
              <img
                src={person.profile_path}
                alt={person.name}
                loading="eager"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900">
                <User className="size-12 sm:size-16 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Bên phải: Thông tin diễn viên */}
          <div className="flex-1 min-w-0 space-y-3 sm:space-y-4 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                {/* Tên diễn viên */}
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                  {person.name}
                </h1>

                {/* Tên khác */}
                {Array.isArray(person.also_known_as) &&
                  person.also_known_as.length > 0 && (
                    <p className="text-slate-400 text-xs sm:text-sm font-medium line-clamp-1">
                      <span className="text-slate-500">Tên khác:</span>{" "}
                      <span className="text-slate-300">
                        {person.also_known_as.slice(0, 3).join(", ")}
                      </span>
                    </p>
                  )}
              </div>

              {/* Thống kê sự nghiệp ở góc phải trên Desktop lớn (lấp đầy không gian trống) */}
              <div className="hidden xl:flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shrink-0">
                <div className="text-center px-2.5 border-r border-white/10">
                  <span className="block text-base font-bold text-emerald-400">
                    {movieCount}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Phim lẻ
                  </span>
                </div>
                <div className="text-center px-2.5 border-r border-white/10">
                  <span className="block text-base font-bold text-cyan-400">
                    {tvCount}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Phim bộ
                  </span>
                </div>
                <div className="text-center px-2.5">
                  <span className="block text-base font-bold text-white">
                    {totalCount}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Tổng phim
                  </span>
                </div>
              </div>
            </div>

            {/* Các thông tin khác (Badges / Chips như ảnh đính kèm) */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {person.place_of_birth && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-slate-200 border border-white/10 backdrop-blur-sm shadow-sm">
                  <MapPin size={13} className="text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">
                    {person.place_of_birth}
                  </span>
                </div>
              )}

              {birthdayText && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-slate-200 border border-white/10 backdrop-blur-sm shadow-sm">
                  <Calendar size={13} className="text-emerald-400 shrink-0" />
                  <span>{birthdayText}</span>
                </div>
              )}

              {departmentText && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-slate-200 border border-white/10 backdrop-blur-sm shadow-sm">
                  <Clapperboard
                    size={13}
                    className="text-emerald-400 shrink-0"
                  />
                  <span>{departmentText}</span>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm shadow-sm">
                <Film size={13} className="text-emerald-400 shrink-0" />
                <span>{totalCount} Phim</span>
              </div>
            </div>

            {/* Trên Desktop / Laptop (lg:): Tiểu sử nằm ngay bên phải để lấp đầy khoảng trống cạnh Avatar */}
            <div className="hidden lg:block pt-2 space-y-2 border-t border-white/10">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Tiểu sử</span>
                <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
              </h2>

              <div className="relative">
                <p
                  className={`text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-normal transition-all duration-300 ${
                    !isBioExpanded ? "line-clamp-4 xl:line-clamp-5" : ""
                  }`}
                >
                  {person.biography ||
                    `Hiện chưa có thông tin tiểu sử chi tiết cho ${person.name}.`}
                </p>

                {person.biography && person.biography.length > 220 && (
                  <button
                    type="button"
                    onClick={() => setIsBioExpanded((prev) => !prev)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none"
                  >
                    {isBioExpanded ? (
                      <>
                        Thu gọn <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        Xem thêm <ChevronDown size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Trên Mobile & Tablet (< lg): Tiểu sử nằm ở dưới full-width như thiết kế ban đầu ─── */}
        <div className="block lg:hidden pt-5 border-t border-white/10 space-y-2.5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2.5">
            <span>Tiểu sử</span>
            <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
          </h2>

          <div className="relative">
            <p
              className={`text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-normal transition-all duration-300 ${
                !isBioExpanded ? "line-clamp-4 sm:line-clamp-5" : ""
              }`}
            >
              {person.biography ||
                `Hiện chưa có thông tin tiểu sử chi tiết cho ${person.name}.`}
            </p>

            {person.biography && person.biography.length > 220 && (
              <button
                type="button"
                onClick={() => setIsBioExpanded((prev) => !prev)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none"
              >
                {isBioExpanded ? (
                  <>
                    Thu gọn <ChevronUp size={15} />
                  </>
                ) : (
                  <>
                    Xem thêm <ChevronDown size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Filmography Section ─── */}
      <section className="space-y-6">
        {/* Header & Controls Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Phim đã tham gia
            </h2>
            <span className="text-xs sm:text-sm font-bold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {filteredCredits.length} Phim
            </span>
          </div>

          {/* Controls: Search, Tabs, View Mode */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search filter input */}
            <div className="relative w-full sm:w-48 md:w-56">
              <input
                type="text"
                placeholder="Tìm tên phim…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-full pl-9 pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
              />
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex items-center rounded-full bg-slate-900/90 border border-white/10 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-full transition-all ${
                  activeTab === "all"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("movie")}
                className={`px-3 py-1 rounded-full transition-all ${
                  activeTab === "movie"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Phim lẻ ({movieCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tv")}
                className={`px-3 py-1 rounded-full transition-all ${
                  activeTab === "tv"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Phim bộ ({tvCount})
              </button>
            </div>

            {/* View Mode Toggle (Grid vs Carousel) */}
            <div className="hidden sm:inline-flex items-center rounded-full bg-slate-900/90 border border-white/10 p-1">
              <button
                type="button"
                title="Dạng lưới (Grid)"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-full transition-all ${
                  viewMode === "grid"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                title="Dạng trượt ngang (Carousel)"
                onClick={() => setViewMode("carousel")}
                className={`p-1.5 rounded-full transition-all ${
                  viewMode === "carousel"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Columns3 size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Filmography Content Display */}
        {filteredCredits.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-10 text-center space-y-3">
            <Film className="size-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 font-medium">
              Không tìm thấy phim phù hợp với bộ lọc hiện tại.
            </p>
            {(searchQuery || activeTab !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
                className="text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* ─── Fully Responsive Grid ─── */
          <div className="grid-movies">
            {filteredCredits.map((movie) => (
              <MovieCard key={movie.slug} movie={movie} />
            ))}
          </div>
        ) : (
          /* ─── Responsive Carousel / Horizontal Slider ─── */
          <div className="relative group/carousel">
            {/* Scroll buttons for desktop */}
            <button
              type="button"
              onClick={() => scrollCarousel("left")}
              className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-slate-900/90 border border-white/10 text-white items-center justify-center shadow-2xl opacity-0 group-hover/carousel:opacity-100 hover:scale-110 hover:border-emerald-500/50 transition-all backdrop-blur-md"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel("right")}
              className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 size-10 rounded-full bg-slate-900/90 border border-white/10 text-white items-center justify-center shadow-2xl opacity-0 group-hover/carousel:opacity-100 hover:scale-110 hover:border-emerald-500/50 transition-all backdrop-blur-md"
            >
              <ChevronRight size={20} />
            </button>

            <div
              ref={carouselRef}
              className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 snap-x no-scrollbar custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
            >
              {filteredCredits.map((movie) => (
                <div
                  key={movie.slug}
                  className="w-[140px] sm:w-[180px] md:w-[200px] lg:w-[220px] shrink-0 snap-start"
                >
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Actor;
