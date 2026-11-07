import { Suspense, lazy, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import PageTransition from '@/components/PageTransition.jsx';
import Layout from '@/components/Layout.jsx';
import { cancelAllPendingRequests } from '@/api/client';
import { cancelAllKKphimRequests } from '@/features/movies/api/movies2';

const Home = lazy(() => import('@/features/movies/pages/Home.jsx'));
const Category = lazy(() => import('@/features/movies/pages/Category.jsx'));
const Country = lazy(() => import('@/features/movies/pages/Country.jsx'));
const Detail = lazy(() => import('@/features/movies/pages/Detail.jsx'));
const Watch = lazy(() => import('@/features/movies/pages/Watch.jsx'));
const Login = lazy(() => import('@/features/auth/pages/Login.jsx'));
const Register = lazy(() => import('@/features/auth/pages/Register.jsx'));
const Profile = lazy(() => import('@/features/auth/pages/Profile.jsx'));
const Saved = lazy(() => import('@/features/movies/pages/Saved.jsx'));
const Search = lazy(() => import('@/features/movies/pages/Search.jsx'));
const Actor = lazy(() => import('@/features/movies/pages/Actor.jsx'));
const AdminPanel = lazy(() => import('@/features/admin/pages/AdminPanel.jsx'));
const NotFound = lazy(() => import('@/components/NotFound.jsx'));

function App() {
  const location = useLocation();

  // ── Cancel stale API requests on route change ──
  // When user navigates away, all in-flight Ophim/KKphim requests are aborted
  // immediately, freeing network connections for the new page.
  useEffect(() => {
    cancelAllPendingRequests();
    cancelAllKKphimRequests();
  }, [location.pathname]);

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
      <Routes>
        {/* Admin — own full-screen layout */}
        <Route path="/admin" element={<PageTransition><AdminPanel /></PageTransition>} />

        {/* Chuyển hướng các URL comic cũ về trang chủ */}
        <Route path="/comics/*" element={<Navigate to="/" replace />} />

        {/* Main site layout - Dành cho Phim */}
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
