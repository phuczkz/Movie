import { useState, useEffect, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { db } from '@/firebase.config.js';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { Plus, Trash2, Edit, CheckCircle2, XCircle, Image as ImageIcon, Search } from "lucide-react";
import { useSearchMovies } from '@/features/movies/hooks/useSearchMovies.js';
import { getOptimizedPoster } from '@/utils/image-helper.js';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  const [movieSlug, setMovieSlug] = useState("");
  const [movieQuery, setMovieQuery] = useState("");
  const [debouncedMovieQuery, setDebouncedMovieQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMovieQuery(movieQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [movieQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target)) setIsSearchOpen(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const { data: searchResults = [], isFetching: isSearching } = useSearchMovies(debouncedMovieQuery, "movie");

  const handleSelectMovie = (movie) => {
    setMovieSlug(movie.slug);
    const poster = getOptimizedPoster(movie.poster_url || movie.thumb_url, 360);
    if (poster) setImageUrl(poster);
    setIsSearchOpen(false);
    setMovieQuery("");
  };

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAnnouncements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return alert("Vui lòng nhập nội dung thông báo.");

    try {
      if (editingId) {
        await updateDoc(doc(db, "announcements", editingId), {
          title,
          content,
          image: imageUrl,
          movieSlug,
          active: isActive,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "announcements"), {
          title: title || "Thông báo hệ thống",
          content,
          image: imageUrl,
          movieSlug,
          active: isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("Đã xảy ra lỗi khi lưu thông báo.");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setContent(item.content);
    setImageUrl(item.image || "");
    setMovieSlug(item.movieSlug || "");
    setIsActive(item.active);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xoá thông báo này?")) {
      try {
        await deleteDoc(doc(db, "announcements", id));
      } catch (error) {
        console.error("Error deleting announcement:", error);
      }
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateDoc(doc(db, "announcements", item.id), {
        active: !item.active,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setImageUrl("");
    setMovieSlug("");
    setIsActive(true);
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Quản lý Thông báo</h2>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors"
          >
            <Plus className="size-4" />
            Tạo thông báo mới
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-slate-900 rounded-xl border border-white/10 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Content */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Tiêu đề (tuỳ chọn - dùng để quản lý)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-white/10 px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Nhập tiêu đề..."
                  />
                </div>
                
                <div className="quill-wrapper">
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Nội dung thông báo
                  </label>
                  <div className="bg-white rounded-lg overflow-hidden">
                    <ReactQuill 
                      theme="snow" 
                      value={content} 
                      onChange={setContent} 
                      modules={modules}
                      className="h-64 mb-10 text-black"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Image Upload */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Hình ảnh / Phim đính kèm (tuỳ chọn)
                </label>

                {/* Search Movie Input */}
                <div className="relative z-10" ref={searchContainerRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      type="text"
                      value={movieQuery}
                      onChange={(e) => {
                        setMovieQuery(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      placeholder="Tìm phim để lấy ảnh..."
                      className="w-full rounded-lg bg-slate-950 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  {isSearchOpen && debouncedMovieQuery && (
                    <div className="absolute left-0 right-0 mt-1 rounded-lg border border-white/10 bg-slate-800 shadow-xl max-h-60 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-3 text-sm text-slate-400 text-center flex items-center justify-center gap-2">
                          <div className="loader-orbit loader-orbit-sm" />
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-3 text-sm text-slate-400 text-center">Không tìm thấy phim</div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {searchResults.slice(0, 5).map(movie => (
                            <button
                              key={movie.slug}
                              type="button"
                              onClick={() => handleSelectMovie(movie)}
                              className="w-full p-2 flex items-center gap-3 hover:bg-slate-700/50 transition-colors text-left"
                            >
                              <img
                                src={getOptimizedPoster(movie.poster_url || movie.thumb_url, 92)}
                                alt={movie.name}
                                className="w-10 h-14 rounded object-cover flex-shrink-0 bg-slate-950"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white line-clamp-1">{movie.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{movie.year || "Đang cập nhật"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 rounded-lg border border-white/10 overflow-hidden relative group h-48 lg:h-[calc(100%-5rem)] min-h-[200px] flex flex-col items-center justify-center">
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl("");
                            setMovieSlug("");
                          }}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium w-32 justify-center"
                        >
                          <Trash2 className="size-4" /> Xóa ảnh
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-4">
                      <ImageIcon className="size-10 opacity-40 mb-2" />
                      <span className="text-sm font-medium text-center text-slate-400">Chưa có ảnh/phim nào được chọn</span>
                      <span className="text-xs opacity-50 text-center px-4 mt-2">Nội dung sẽ hiển thị bên trái, ảnh hiển thị bên phải (nếu có). Sử dụng thanh tìm kiếm phía trên để lấy ảnh phim.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-white/20 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-300">
                  Hiển thị thông báo ngay
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors"
                >
                  {editingId ? "Cập nhật" : "Đăng thông báo"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách thông báo */}
      <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="loader-orbit loader-orbit-sm" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Chưa có thông báo nào.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {announcements.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {item.title || "Thông báo hệ thống"}
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.createdAt?.toDate?.()?.toLocaleString("vi-VN") || "Mới tạo"}
                  </p>
                  <div 
                    className="text-sm text-slate-300 mt-2 line-clamp-2 prose prose-sm prose-invert"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                  {item.image && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-12 h-12 rounded bg-slate-950 border border-white/10 overflow-hidden shrink-0">
                        <img src={item.image} alt="Thumb" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs text-emerald-400">Đính kèm ảnh</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(item)}
                    title={item.active ? "Tắt" : "Bật"}
                    className="p-2 text-slate-400 hover:text-amber-400 bg-slate-950 rounded-lg border border-white/5 hover:border-amber-400/30 transition-all"
                  >
                    {item.active ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    title="Sửa"
                    className="p-2 text-slate-400 hover:text-blue-400 bg-slate-950 rounded-lg border border-white/5 hover:border-blue-400/30 transition-all"
                  >
                    <Edit className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Xoá"
                    className="p-2 text-slate-400 hover:text-red-400 bg-slate-950 rounded-lg border border-white/5 hover:border-red-400/30 transition-all"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
