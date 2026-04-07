import { Suspense, lazy } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ComicLayout from "./components/comics/ComicLayout.jsx";
import { useAppMode } from "./context/AppModeContext";
import { useEffect } from "react";

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
  const { setAppMode } = useAppMode();

  useEffect(() => {
    // Tự động nhận diện Chế độ dựa trên URL (Tránh bị hiện lại Selection Screen khi F5)
    if (location.pathname.startsWith("/comics")) {
      setAppMode("comic");
    } else if (location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register") {
      // Khi ở trang chủ hoặc trang auth, giữ nguyên hoặc để logic khác xử lý
    } else if (location.pathname === "/profile") {
      // Giữ nguyên mode hiện tại khi xem profile
    } else {
      setAppMode("movie");
    }
  }, [location.pathname, setAppMode]);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="loader-orbit loader-orbit-sm" />
        </div>
      }
    >
      <Routes>
        {/* Admin — own full-screen layout */}
        <Route path="/admin" element={<AdminPanel />} />

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
    </Suspense>
  );
}

export default App;
