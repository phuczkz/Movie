import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";

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

function App() {
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

        {/* Main site layout */}
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
