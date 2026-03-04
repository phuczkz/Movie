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

function App() {
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="py-10 text-center text-slate-300">Đang tải...</div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:category" element={<Category />} />
          <Route path="/category/:category/:page" element={<Category />} />
          <Route path="/country/:country" element={<Country />} />
          <Route path="/country/:country/:page" element={<Country />} />
          <Route path="/movie/:slug" element={<Detail />} />
          <Route path="/watch/:slug" element={<Watch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Saved />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
