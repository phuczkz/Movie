import { useState, useEffect, useRef, useMemo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { db } from "@/firebase.config.js";
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
import {
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Search,
  X,
  Film,
  Megaphone,
  Calendar,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useSearchMovies } from "@/features/movies/hooks/useSearchMovies.js";
import { getOptimizedPoster } from "@/utils/image-helper.js";
import { sanitizeHtml } from "@/utils/sanitize";
import ConfirmModal from "@/components/ConfirmModal";

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [movieSlug, setMovieSlug] = useState("");

  // Movie Search State
  const [movieQuery, setMovieQuery] = useState("");
  const [debouncedMovieQuery, setDebouncedMovieQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Filter & Search in Announcement List
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'

  // Confirm Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    title: "",
    loading: false,
  });

  const searchContainerRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMovieQuery(movieQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [movieQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const { data: searchResults = [], isFetching: isSearching } = useSearchMovies(
    debouncedMovieQuery,
    "movie"
  );

  const handleSelectMovie = (movie) => {
    setMovieSlug(movie.slug || "");
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
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setAnnouncements(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching announcements:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const scrollToForm = () => {
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const mainEl = document.querySelector("main");
        if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 60);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
    scrollToForm();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setContent(item.content || "");
    setImageUrl(item.image || "");
    setMovieSlug(item.movieSlug || "");
    setIsActive(item.active ?? true);
    setIsFormOpen(true);
    scrollToForm();
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setImageUrl("");
    setMovieSlug("");
    setIsActive(true);
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || content === "<p><br></p>") {
      alert("Vui lòng nhập nội dung thông báo.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "announcements", editingId), {
          title: title.trim(),
          content,
          image: imageUrl,
          movieSlug,
          active: isActive,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "announcements"), {
          title: title.trim() || "Thông báo hệ thống",
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
      alert("Đã xảy ra lỗi khi lưu thông báo. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
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

  const handleOpenDelete = (item) => {
    setDeleteModal({
      isOpen: true,
      id: item.id,
      title: item.title || "Thông báo hệ thống",
      loading: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await deleteDoc(doc(db, "announcements", deleteModal.id));
      setDeleteModal({ isOpen: false, id: null, title: "", loading: false });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert("Đã xảy ra lỗi khi xoá thông báo.");
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Streamlined Quill toolbar for clean mobile & desktop formatting
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "clean"],
      ],
    }),
    []
  );

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      // Filter status
      if (statusFilter === "active" && !item.active) return false;
      if (statusFilter === "inactive" && item.active) return false;

      // Filter search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(term);
        const matchesContent = item.content?.toLowerCase().includes(term);
        const matchesSlug = item.movieSlug?.toLowerCase().includes(term);
        return matchesTitle || matchesContent || matchesSlug;
      }
      return true;
    });
  }, [announcements, statusFilter, searchTerm]);

  const activeCount = useMemo(
    () => announcements.filter((a) => a.active).length,
    [announcements]
  );
  const inactiveCount = announcements.length - activeCount;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-white/5 p-4 sm:p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Megaphone className="size-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                Quản lý Thông báo
              </h2>
              <p className="text-xs text-slate-400">
                Hiển thị thông báo trên trang chủ, popup và trung tâm thông báo người dùng
              </p>
            </div>
          </div>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 shrink-0"
          >
            <Plus className="size-4" />
            <span>Tạo thông báo mới</span>
          </button>
        )}
      </div>

      {/* Form Tạo / Chỉnh sửa */}
      {isFormOpen && (
        <div
          ref={formRef}
          className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl relative scroll-mt-6"
        >
          {/* Form Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingId ? "Chỉnh sửa thông báo" : "Tạo thông báo mới"}
              </h3>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Đóng form"
            >
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
              {/* Left Column: Title & Editor */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                    Tiêu đề thông báo <span className="text-slate-500 font-normal">(tuỳ chọn)</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    placeholder="Ví dụ: Cập nhật tính năng xem phim mới..."
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-300">
                      Nội dung thông báo <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Hỗ trợ định dạng văn bản & liên kết
                    </span>
                  </div>

                  {/* Dark-themed Responsive Quill Editor */}
                  <div className="dark-quill rounded-xl overflow-hidden shadow-inner">
                    <ReactQuill
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      modules={modules}
                      placeholder="Nhập nội dung thông báo gửi đến người dùng..."
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Poster / Media */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                    Ảnh / Phim đính kèm <span className="text-slate-500 font-normal">(tuỳ chọn)</span>
                  </label>

                  {/* Search Movie Bar */}
                  <div className="relative z-20" ref={searchContainerRef}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input
                        type="text"
                        value={movieQuery}
                        onChange={(e) => {
                          setMovieQuery(e.target.value);
                          setIsSearchOpen(true);
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                        placeholder="Tìm phim để lấy ảnh bìa..."
                        className="w-full rounded-xl bg-slate-950 border border-white/10 pl-9 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                      />
                      {movieQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMovieQuery("");
                            setIsSearchOpen(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>

                    {/* Movie Search Dropdown Results */}
                    {isSearchOpen && debouncedMovieQuery && (
                      <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-white/10 bg-slate-900 shadow-2xl max-h-56 overflow-y-auto z-30 custom-scrollbar">
                        {isSearching ? (
                          <div className="p-4 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                            <div className="loader-orbit loader-orbit-sm" />
                            <span>Đang tìm phim...</span>
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-4 text-xs text-slate-400 text-center">
                            Không tìm thấy phim phù hợp
                          </div>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {searchResults.slice(0, 6).map((movie) => (
                              <button
                                key={movie.slug}
                                type="button"
                                onClick={() => handleSelectMovie(movie)}
                                className="w-full p-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                              >
                                <img
                                  src={getOptimizedPoster(
                                    movie.poster_url || movie.thumb_url,
                                    92
                                  )}
                                  alt={movie.name}
                                  className="w-9 h-12 rounded-lg object-cover shrink-0 bg-slate-950 border border-white/10"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs sm:text-sm font-semibold text-white line-clamp-1">
                                    {movie.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                    <span>{movie.year || "Phim"}</span>
                                    <span>•</span>
                                    <span className="truncate">{movie.slug}</span>
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value.trim())}
                    placeholder="Hoặc dán URL ảnh trực tiếp..."
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Image Preview Box - Fully Touch Friendly */}
                <div className="bg-slate-950 rounded-xl border border-white/10 overflow-hidden relative min-h-[180px] h-48 sm:h-52 lg:h-[220px] flex flex-col items-center justify-center">
                  {imageUrl ? (
                    <div className="relative size-full group">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="size-full object-contain p-2"
                      />
                      {/* Delete Action Button - Always easily accessible on mobile touch screen */}
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl("");
                            setMovieSlug("");
                          }}
                          className="px-2.5 py-1.5 bg-rose-600/90 hover:bg-rose-600 active:scale-95 text-white rounded-lg shadow-lg flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm transition-all"
                          title="Xóa ảnh này"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Xóa ảnh</span>
                        </button>
                      </div>

                      {/* Movie Slug Badge Info */}
                      {movieSlug && (
                        <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/85 backdrop-blur-sm border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5">
                          <Film className="size-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">Liên kết: {movieSlug}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="size-full flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400">
                        <ImageIcon className="size-6 opacity-60" />
                      </div>
                      <span className="text-xs font-semibold text-slate-300">
                        Chưa chọn ảnh đính kèm
                      </span>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Tìm phim hoặc dán link ảnh ở trên để hiển thị ảnh cùng thông báo
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Form Action Buttons - Fully Mobile Friendly */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-white/10">
              <label className="flex items-center gap-2.5 cursor-pointer py-1 select-none">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4 rounded border-white/20 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  Hiển thị thông báo ngay lập tức
                </span>
              </label>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-center"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="loader-orbit loader-orbit-sm" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  <span>{editingId ? "Cập nhật thông báo" : "Đăng thông báo"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách thông báo với Bộ lọc & Tìm kiếm */}
      <div className="space-y-4">
        {/* Thanh tìm kiếm & lọc nhanh */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                statusFilter === "all"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tất cả ({announcements.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === "active"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Đang bật ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === "inactive"
                  ? "bg-white/10 text-slate-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="size-1.5 rounded-full bg-slate-500" />
              Đã tắt ({inactiveCount})
            </button>
          </div>

          {/* Quick Search in Announcements */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm thông báo..."
              className="w-full rounded-xl bg-slate-900/80 border border-white/5 py-1.5 pl-9 pr-8 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* List of Announcement Cards */}
        <div className="bg-slate-900/80 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="loader-orbit loader-orbit-sm" />
              <p className="text-xs text-slate-400">Đang tải danh sách thông báo...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-500">
                <AlertCircle className="size-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                {searchTerm || statusFilter !== "all"
                  ? "Không tìm thấy thông báo phù hợp bộ lọc."
                  : "Chưa có thông báo nào trong hệ thống."}
              </p>
              {!isFormOpen && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                >
                  Tạo thông báo đầu tiên ngay
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col gap-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Card Top: Title, Status, and Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${
                          item.active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-500/15 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            item.active ? "bg-emerald-400" : "bg-slate-400"
                          }`}
                        />
                        {item.active ? "Đang bật" : "Đã tắt"}
                      </span>

                      <h3 className="font-bold text-sm sm:text-base text-white break-words">
                        {item.title || "Thông báo hệ thống"}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                      <Calendar className="size-3.5" />
                      <span>
                        {item.createdAt?.toDate?.()?.toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }) || "Vừa xong"}
                      </span>
                    </div>
                  </div>

                  {/* Card Middle: Content & Optional Image */}
                  <div className="flex flex-col sm:flex-row gap-3.5 items-start">
                    {/* Media Thumbnail */}
                    {item.image && (
                      <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl bg-slate-950 border border-white/10 overflow-hidden shrink-0 shadow-md">
                        <img
                          src={item.image}
                          alt="Poster"
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Content snippet */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs sm:text-sm text-slate-300 line-clamp-3 prose prose-invert max-w-none break-words"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(item.content),
                        }}
                      />

                      {item.movieSlug && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] text-emerald-400 font-medium">
                          <Film className="size-3 shrink-0" />
                          <span className="truncate max-w-xs">Phim: {item.movieSlug}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Mobile-First Responsive Action Toolbar */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    {/* Toggle Status Button */}
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                        item.active
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                      title={item.active ? "Tắt thông báo" : "Bật thông báo"}
                    >
                      {item.active ? (
                        <>
                          <XCircle className="size-3.5" />
                          <span>Tắt</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          <span>Bật</span>
                        </>
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-sky-400 border border-white/10 hover:border-sky-400/30 transition-all"
                      title="Chỉnh sửa thông báo"
                    >
                      <Edit className="size-3.5" />
                      <span>Sửa</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(item)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-rose-500/15 text-rose-400 border border-white/10 hover:border-rose-400/30 transition-all"
                      title="Xoá thông báo"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Xoá</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận xoá thông báo"
        message={`Bạn có chắc chắn muốn xoá thông báo "${deleteModal.title}"? Thao tác này sẽ xoá vĩnh viễn và không thể khôi phục.`}
        confirmText="Xoá vĩnh viễn"
        cancelText="Huỷ bỏ"
        type="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setDeleteModal({ isOpen: false, id: null, title: "", loading: false })
        }
      />
    </div>
  );
}
