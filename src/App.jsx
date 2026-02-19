import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Category from "./pages/Category.jsx";
import Country from "./pages/Country.jsx";
import Detail from "./pages/Detail.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import Register from "./pages/Register.jsx";
import Search from "./pages/Search.jsx";
import Saved from "./pages/Saved.jsx";
import Watch from "./pages/Watch.jsx";

function App() {
  return (
    <Layout>
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
        <Route path="/saved" element={<Saved />} />
        <Route path="/search" element={<Search />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}

export default App;
