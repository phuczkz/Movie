import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import Hero from "../components/Hero.jsx";
import MovieCard from "../components/MovieCard.jsx";
import Section from "../components/Section.jsx";
import GridSkeleton from "../components/GridSkeleton.jsx";
import { useMoviesList } from "../hooks/useMoviesList.js";
import { useTmdbPopular } from "../hooks/useTmdbPopular.js";
import { useKKphimMovies } from "../hooks/useKKphimMovies.js";
import LoginBanner from "../components/LoginBanner.jsx";
import TrendingSection from "../components/TrendingSection.jsx";

const quickFocusCards = [
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
    title: "Sitcom",
    subtitle: "Game Shows",
    to: "/search?q=sitcom",
    gradient: "from-[#5f9f8e] to-[#9d7f72]",
  },
  {
    title: "Chiếu Rạp",
    subtitle: "Mới Nhất",
    to: "/search?q=chieu-rap",
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
    to: "/search?q=co-trang",
    gradient: "from-[#b56168] to-[#a94b59]",
  },
  {
    title: "Thuyết Minh",
    subtitle: "VietDub",
    to: "/search?q=thuyet-minh",
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

const Grid = ({
  items = [],
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

  const [refSeries, showSeries] = useSectionVisibility();
  // const [refSingle, showSingle] = useSectionVisibility();
  const [refAnime, showAnime] = useSectionVisibility();
  const [refPopular, showPopular] = useSectionVisibility();
  const [refKKSeries, showKKSeries] = useSectionVisibility();
  const [refKKSingle, showKKSingle] = useSectionVisibility();

  const { data: latest = [] } = useMoviesList("latest", undefined, {
    enabled: true,
    ...commonQueryOpts,
  });
  const { data: anime = [], isLoading: loadingAnime } = useMoviesList(
    undefined,
    "hoat-hinh",
    { enabled: showAnime, ...commonQueryOpts }
  );
  const { data: series = [], isLoading: loadingSeries } = useMoviesList(
    "series",
    undefined,
    { enabled: showSeries, ...commonQueryOpts }
  );
  // const { data: single = [], isLoading: loadingSingle } = useMoviesList(
  //   "single",
  //   undefined,
  //   { enabled: showSingle, ...commonQueryOpts }
  // );
  const { data: popular = [], isLoading: loadingPopular } = useTmdbPopular(1, {
    enabled: true,
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

  const heroSource = latest && latest.length >= 4 ? latest : popular;
  const heroMovies = heroSource.slice(0, 4);
  const cap = (list) => list.slice(0, 7);

  return (
    <div className="space-y-10">
      <LoginBanner />

      <Hero movies={heroMovies} />

      <section className="rounded-3xl border border-white/5 bg-slate-950/80 p-0 overflow-hidden relative">
        <div className="mb-4 flex items-center gap-3 pt-6 px-4 sm:px-6 sm:mb-5">
          <span className="h-7 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Bạn đang quan tâm gì?
          </h2>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-8 no-scrollbar px-4 sm:px-6 xl:grid xl:grid-cols-8 xl:gap-4 xl:pb-6">
          {quickFocusCards.map((item) => (
            <Link
              key={item.title}
              to={item.to}
              title={`Khám phá ngay ${item.title}`}
              aria-label={`Xem danh sách phim ${item.title} - ${item.subtitle}`}
              className="group relative flex-shrink-0 w-[150px] sm:w-[170px] xl:w-auto overflow-hidden rounded-2xl border border-white/10 p-5 min-h-[110px] sm:min-h-[130px] transition-all duration-500 hover:border-white/25 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-80 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110`}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-all duration-500 group-hover:bg-white/20" />
              
              <div className="relative z-10 flex h-full flex-col justify-between">
                <h3 className="text-2xl font-black text-white leading-none tracking-tight drop-shadow-md">
                  {item.title}
                </h3>
                <div className="inline-flex items-center gap-1.5 text-white/90 text-sm font-bold tracking-wide uppercase">
                  <span>{item.subtitle}</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
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

      <div ref={refKKSeries}>
        <Section
          title="Phim bộ (1)"
          action={
            <Link className="text-sm text-amber-300" to="/category/phim-bo">
              Xem thêm
            </Link>
          }
        >
          {loadingKKSeries ? (
            <GridSkeleton count={4} baseClass="home-grid-movies" />
          ) : (
            <Grid items={cap(kkSeries)} priorityCount={4} />
          )}
        </Section>
      </div>

      <div ref={refKKSingle}>
        <Section
          title="Phim lẻ (1)"
          action={
            <Link className="text-sm text-amber-300" to="/category/phim-le">
              Xem thêm
            </Link>
          }
        >
          {loadingKKSingle ? (
            <GridSkeleton count={4} baseClass="home-grid-movies" />
          ) : (
            <Grid items={cap(kkSingle)} priorityCount={4} />
          )}
        </Section>
      </div>

      <div ref={refPopular}>
        <Section
          title="Phim thịnh hành (Poster)"
          action={
            <Link className="text-sm text-emerald-300" to="/category/phim-moi">
              Xem thêm
            </Link>
          }
        >
          {loadingPopular ? (
            <GridSkeleton count={4} baseClass="home-grid-movies" />
          ) : (
            <Grid items={cap(popular)} priorityCount={4} />
          )}
        </Section>
      </div>

      <div ref={refAnime}>
        <Section
          title="Phim hoạt hình"
          action={
            <Link className="text-sm text-emerald-300" to="category/hoat-hinh">
              Xem thêm
            </Link>
          }
        >
          {loadingAnime ? (
            <GridSkeleton
              count={4}
              variant="landscape"
              className=""
              baseClass="home-grid-movies-landscape"
            />
          ) : (
            <Grid
              items={cap(anime)}
              variant="landscape"
              className=""
              priorityCount={4}
            />
          )}
        </Section>
      </div>

      <div ref={refSeries}>
        <Section
          title="Phim bộ (2)"
          action={
            <Link className="text-sm text-emerald-300" to="/category/phim-bo">
              Xem thêm
            </Link>
          }
        >
          {loadingSeries ? (
            <GridSkeleton count={3} baseClass="home-grid-movies" />
          ) : (
            <Grid items={cap(series)} priorityCount={3} />
          )}
        </Section>
      </div>

      {/* <div ref={refSingle}>
        <Section
          title="Phim lẻ (2)"
          action={
            <Link className="text-sm text-emerald-300" to="/category/phim-le">
              Xem thêm
            </Link>
          }
        >
          {loadingSingle ? (
            <GridSkeleton count={3} />
          ) : (
            <Grid items={cap(single)} priorityCount={3} />
          )}
        </Section>
      </div> */}
    </div>
  );
};

export default Home;
