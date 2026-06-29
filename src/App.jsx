import { Suspense, lazy, useEffect } from "react";
import {
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "./components/PageTransition.jsx";
import Layout from "./components/Layout.jsx";
import ComicLayout from "./components/comics/ComicLayout.jsx";
import { useAppMode } from "./context/AppModeContext";
import { cancelAllPendingRequests } from "./api/client";
import { cancelAllKKphimRequests } from "./api/movies2";

const Home = lazy(() => import("./pages/Home.jsx"));
const Category = lazy(() => import("./pages/Category.jsx"));
const Country = lazy(() => import("./pages/Country.jsx"));
const Detail = lazy(() => import("./pages/Detail.jsx"));
const Watch = lazy(() => import("./pages/Watch.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Saved = lazy(() => import("./pages/Saved.jsx"));
const Search = lazy(() => import("./pages/Search.jsx"));
const Actor = lazy(() => import("./pages/Actor.jsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.jsx"));

// Comics
const ComicHome = lazy(() => import("./pages/comics/ComicHome.jsx"));
const ComicDetail = lazy(() => import("./pages/comics/ComicDetail.jsx"));
const ComicReader = lazy(() => import("./pages/comics/ComicReader.jsx"));
const ComicList = lazy(() => import("./pages/comics/ComicList.jsx"));
const ComicFavorites = lazy(() => import("./pages/comics/ComicFavorites.jsx"));

function App() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { appMode, setAppMode } = useAppMode();

  // ── Cancel stale API requests on route change ──
  // When user navigates away, all in-flight Ophim/KKphim requests are aborted
  // immediately, freeing network connections for the new page.
  useEffect(() => {
    cancelAllPendingRequests();
    cancelAllKKphimRequests();
  }, [location.pathname]);

  useEffect(() => {
    // Read location.pathname inside effect body — not as deps — to avoid mutable-in-deps warning
    const path = location.pathname;

    // Tự động nhận diện chế độ dựa trên URL, nhưng tôn trọng lựa chọn comic đã lưu ở trang "/"
    if (path.startsWith("/comics")) {
      if (appMode !== "comic") setAppMode("comic");
      return;
    }

    if (path === "/login" || path === "/register" || path === "/profile") {
      return;
    }

    // Keep comic mode at root only on direct entry/refresh.
    // For in-app navigation to "/", switch to movie mode so Header state stays in sync.
    if (path === "/" && appMode === "comic" && navigationType === "POP") {
      return;
    }

    if (appMode !== "movie") {
      setAppMode("movie");
    }
  }, [location, setAppMode, appMode, navigationType]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0b15] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,176,155,0.05),transparent_50%)]" />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="loader-orbit loader-orbit-lg"></div>
            <div className="animate-pulse flex flex-col items-center">
              <span className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase"></span>
            </div>
          </div>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname.split('/')[1] || 'root'}>
          {/* Admin — own full-screen layout */}
          <Route path="/admin" element={<PageTransition><AdminPanel /></PageTransition>} />

          {/* Comic site layout - Đưa LÊN TRƯỚC để trình duyệt không nhận nhầm trang Phim */}
          <Route
            path="/comics/*"
            element={
              <ComicLayout>
                <Routes>
                  <Route path="/" element={<ComicHome />} />
                  <Route path="/page/:page" element={<ComicHome />} />
                  <Route path="/danh-sach/:type" element={<ComicList />} />
                  <Route path="/danh-sach/:type/:page" element={<ComicList />} />
                  <Route path="/the-loai/:slug" element={<ComicList />} />
                  <Route path="/the-loai/:slug/:page" element={<ComicList />} />
                  <Route path="/:slug" element={<ComicDetail />} />
                  <Route path="/chapter/:chapterId" element={<ComicReader />} />
                  <Route path="/favorites" element={<ComicFavorites />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<ComicHome />} />
                </Routes>
              </ComicLayout>
            }
          />

          {/* Main site layout - Catch-all dành cho Phim */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/category/:category" element={<Category />} />
                  <Route
                    path="/category/:category/:page"
                    element={<Category />}
                  />
                  <Route path="/country/:country" element={<Country />} />
                  <Route path="/country/:country/:page" element={<Country />} />
                  <Route path="/movie/:slug" element={<Detail />} />
                  <Route path="/watch/:slug" element={<Watch />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/favorites" element={<Saved />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/actor/:id" element={<Actor />} />
                  <Route path="*" element={<Home />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;
