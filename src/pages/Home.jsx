import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import Hero from "../components/Hero.jsx";
import MovieCard from "../components/MovieCard.jsx";
import Section from "../components/Section.jsx";
import GridSkeleton from "../components/GridSkeleton.jsx";
import { useMoviesList } from "../hooks/useMoviesList.js";
import { useKKphimMovies } from "../hooks/useKKphimMovies.js";
import { useHoatHinhMerged } from "../hooks/useHoatHinhMerged.js";
import { useChieuRapMerged } from "../hooks/useChieuRapMerged.js";
import LoginBanner from "../components/LoginBanner.jsx";
import TrendingSection from "../components/TrendingSection.jsx";
import TheaterShowcase from "../components/TheaterShowcase.jsx";
import WeeklyRanking from "../components/WeeklyRanking.jsx";
import VietnamBanner from "../components/VietnamBanner.jsx";
import SEO from "../components/SEO.jsx";
import { db } from "../firebase.config.js";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext.jsx";
import AnnouncementModal from "../components/AnnouncementModal.jsx";


const quickFocusCards = [
  {
    title: "Việt Nam",
    subtitle: "Đặc Sắc",
    to: "/country/viet-nam",
    gradient: "from-[#8f75b2] to-[#b57887]",
  },
  {
    title: "Hàn Quốc",
    subtitle: "Phim Bộ",
    to: "/country/han-quoc",
    gradient: "from-[#6d7fd1] to-[#b791bc]",
  },
  {
    title: "Trung Quốc",
    subtitle: "Hoa Ngữ",
    to: "/country/trung-quoc",
    gradient: "from-[#d290b2] to-[#cf7ea1]",
  },
  {
    title: "Thái Lan",
    subtitle: "Cực Hay",
    to: "/country/thai-lan",
    gradient: "from-[#6887d0] to-[#9d5f8e]",
  },
  {
    title: "Chiếu Rạp",
    subtitle: "Mới Nhất",
    to: "/category/phim-chieu-rap",
    gradient: "from-[#8f75b2] to-[#b57887]",
  },
  {
    title: "Kinh Dị",
    subtitle: "Thót Tim",
    to: "/category/kinh-di",
    gradient: "from-[#c48374] to-[#b76563]",
  },
  {
    title: "Cổ Trang",
    subtitle: "Huyền Huyễn",
    to: "/category/co-trang",
    gradient: "from-[#b56168] to-[#a94b59]",
  },
  {
    title: "Thuyết Minh",
    subtitle: "Thuyết Minh",
    to: "/category/phim-thuyet-minh",
    gradient: "from-[#6f7d94] to-[#4f5f78]",
  },
];

// Observe once per section to lazy-enable fetching and rendering
const useSectionVisibility = () => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  return [ref, visible];
};

const EMPTY_ITEMS = [];

const Grid = ({
  items = EMPTY_ITEMS,
  variant = "portrait",
  className = "",
  priorityCount = 0,
}) => {
  const baseClass =
    variant === "landscape" ? "home-grid-movies-landscape" : "home-grid-movies";
  return (
    <div className={`${baseClass} ${className}`.trim()}>
      {items.map((movie, idx) => (
        <MovieCard
          key={movie.slug}
          movie={movie}
          variant={variant}
          priority={idx < priorityCount}
        />
      ))}
    </div>
  );
};

const Home = () => {
  const commonQueryOpts = {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  };

  const { userProfile, markAnnouncementAsRead } = useAuth();
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      if (!userProfile || !userProfile.isWhitelisted || !db) return;
      try {
        const q = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const activeDoc = snapshot.docs.find(doc => doc.data().active === true);
        
        if (activeDoc) {
          const data = { id: activeDoc.id, ...activeDoc.data() };
          if (!userProfile.readAnnouncements?.includes(data.id)) {
            setActiveAnnouncement(data);
          }
        }
      } catch (err) {
        console.error("Error fetching announcement:", err);
      }
    };
    fetchAnnouncement();
  }, [userProfile]);

  const handleConfirmAnnouncement = async () => {
    if (activeAnnouncement) {
      await markAnnouncementAsRead(activeAnnouncement.id);
      setActiveAnnouncement(null);
    }
  };

  const [refAnime, showAnime] = useSectionVisibility();
  const [refKKSeries, showKKSeries] = useSectionVisibility();
  const [refKKSingle, showKKSingle] = useSectionVisibility();
  const [refTheater, showTheater] = useSectionVisibility();
  const [refRanking] = useSectionVisibility();

  const { data: latest = [] } = useMoviesList("latest", undefined, {
    enabled: true,
    ...commonQueryOpts,
  });
  const { data: anime = [], isLoading: loadingAnime } = useHoatHinhMerged(1, {
    enabled: showAnime,
    ...commonQueryOpts,
  });


  const { data: kkSeries = [], isLoading: loadingKKSeries } = useKKphimMovies(
    "series",
    { enabled: showKKSeries, ...commonQueryOpts }
  );
  const { data: kkSingle = [], isLoading: loadingKKSingle } = useKKphimMovies(
    "single",
    { enabled: showKKSingle, ...commonQueryOpts }
  );

  const { data: chieuRap = [], isLoading: loadingChieuRap } =
    useChieuRapMerged(1, {
      enabled: showTheater,
      ...commonQueryOpts,
    });

  // For weekly ranking, reuse the latest movies data (sorted by recency ≈ popularity)
  const rankingMovies = latest.slice(0, 10);

  const heroMovies = latest.slice(0, 4);
  // On desktop with sidebar, we have less horizontal space → show fewer items
  const cap = (list) => list.slice(0, 7);

  return (
    <div className="space-y-8 sm:space-y-10 lg:space-y-12">
      <SEO />
      
      <AnnouncementModal 
        announcement={activeAnnouncement}
        onConfirm={handleConfirmAnnouncement}
        onClose={() => setActiveAnnouncement(null)}
      />

      <LoginBanner />

      <Hero movies={heroMovies} />

      <VietnamBanner />

      <section className="!mt-0 rounded-3xl p-0 overflow-hidden relative">
        <div className="mb-4 flex items-center gap-3 pt-6 pr-4 sm:pr-6 pl-0 sm:pl-0 sm:mb-5">
          <span className="h-7 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Bạn đang quan tâm gì?
          </h2>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-8 no-scrollbar pr-4 sm:pr-6 pl-0 sm:pl-0 md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 md:gap-4 md:pb-6">
          {quickFocusCards.map((item) => (
            <Link
              key={item.title}
              to={item.to}
              title={`Khám phá ngay ${item.title}`}
              aria-label={`Xem danh sách phim ${item.title} - ${item.subtitle}`}
              className="group relative flex-shrink-0 w-[140px] sm:w-[160px] md:w-auto overflow-hidden rounded-2xl border border-white/10 p-4 sm:p-5 min-h-[100px] sm:min-h-[120px] transition-all duration-500 hover:border-white/25 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-80 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110`}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="absolute -right-4 -top-4 size-24 rounded-full bg-white/10 blur-2xl transition-all duration-500 group-hover:bg-white/20" />

              <div className="relative z-10 flex h-full flex-col justify-between">
                <h3 className="text-2xl font-semibold text-white leading-none tracking-tight drop-shadow-md">
                  {item.title}
                </h3>
                <div className="inline-flex items-center gap-1.5 text-white/90 text-sm font-bold tracking-wide uppercase">
                  <span>{item.subtitle}</span>
                  <ChevronRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <TrendingSection
        movies={kkSeries.slice(0, 10)}
        loading={loadingKKSeries}
      />

      {/* Phim chiếu rạp — landscape cards (MotChill "Đề Cử" pattern) */}
      <div ref={refTheater}>
        <TheaterShowcase
          movies={chieuRap.slice(0, 10)}
          loading={loadingChieuRap}
        />
      </div>

      {/* Main content + Sidebar ranking layout (MotChill pattern) */}
      <div className="xl:grid xl:grid-cols-[1fr_300px] xl:gap-6 2xl:grid-cols-[1fr_320px] 2xl:gap-8 space-y-10 xl:space-y-0">
        {/* Left: Movie grid sections */}
        <div className="space-y-8 sm:space-y-10 lg:space-y-12">
          <div ref={refKKSeries}>
            <Section
              title="Phim bộ mới cập nhật"
              action={
                <Link className="text-sm text-amber-300 hover:text-amber-200 transition-colors" to="/category/phim-bo">
                  Xem tất cả
                </Link>
              }
            >
              {loadingKKSeries ? (
                <div className="flex h-[280px] w-full items-center justify-center bg-slate-900/10 rounded-3xl border border-white/5 backdrop-blur-sm">
                  <div className="loader-orbit loader-orbit-md"></div>
                </div>
              ) : (
                <Grid items={cap(kkSeries)} priorityCount={4} />
              )}
            </Section>
          </div>

          <div ref={refKKSingle}>
            <Section
              title="Phim lẻ mới"
              action={
                <Link className="text-sm text-amber-300 hover:text-amber-200 transition-colors" to="/category/phim-le">
                  Xem tất cả
                </Link>
              }
            >
              {loadingKKSingle ? (
                <div className="flex h-[280px] w-full items-center justify-center bg-slate-900/10 rounded-3xl border border-white/5 backdrop-blur-sm">
                  <div className="loader-orbit loader-orbit-md"></div>
                </div>
              ) : (
                <Grid items={cap(kkSingle)} priorityCount={4} />
              )}
            </Section>
          </div>
        </div>

        {/* Right: Weekly ranking sidebar ("Phim Hot Trong Tuần") */}
        <div ref={refRanking} className="xl:relative">
          <div className="xl:absolute xl:inset-0 w-full h-full">
            <WeeklyRanking movies={rankingMovies} />
          </div>
        </div>
      </div>

      <div ref={refAnime}>
        <Section
          title="Hoạt hình"
          action={
            <Link className="text-sm text-emerald-300 hover:text-emerald-200 transition-colors" to="category/hoat-hinh">
              Xem tất cả
            </Link>
          }
        >
          {loadingAnime ? (
            <div className="flex h-[200px] w-full items-center justify-center bg-slate-900/10 rounded-3xl border border-white/5 backdrop-blur-sm">
              <div className="loader-orbit loader-orbit-md"></div>
            </div>
          ) : (
            <Grid
              items={cap(anime)}
              className=""
              priorityCount={4}
            />
          )}
        </Section>
      </div>


    </div>
  );
};

export default Home;
