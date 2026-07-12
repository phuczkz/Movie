import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { comicApi } from '@/features/comics/api/comicApi';
import { BookOpen, List, Info, AlertCircle, Heart, ChevronDown } from "lucide-react";
import { useSavedComic } from '@/features/comics/hooks/useSavedComic';
import { useAuth } from '@/features/auth/context/AuthContext.jsx';
import { useNavigate } from "react-router-dom";

const IMAGE_CDN = import.meta.env.VITE_COMIC_IMAGE_CDN || "https://img.otruyenapi.com/uploads/comics/";

export default function ComicDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toggleSave, isSaved, loading: favLoading } = useSavedComic(slug);

  const { data: detailData, isLoading, error } = useQuery({
    queryKey: ["comicDetail", slug],
    queryFn: () => comicApi.getDetail(slug),
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="loader-orbit" />
      </div>
    );
  }

  if (error || !detailData?.data?.item) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="size-12 text-red-500" />
        <p className="text-slate-300">Không thể tải thông tin truyện.</p>
        <Link to="/comics" className="text-purple-400 hover:text-purple-300">
          Quay lại MangaHub
        </Link>
      </div>
    );
  }

  const comic = detailData.data.item;
  const chapters = comic.chapters?.[0]?.server_data || [];
  const imageUrl = `${IMAGE_CDN}${comic.thumb_url}`;

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* Backdrop & Info Section */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl p-6 md:p-10 mb-12">
        <div 
          className="absolute inset-0 z-0 opacity-25 blur-xl scale-110 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />

        <div className="relative z-10 flex flex-col md:flex-row gap-8">
          {/* Thumb */}
          <div className="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
            <img
              src={imageUrl}
              alt={comic.name}
              className="w-full h-auto rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.3)] border border-white/10"
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-semibold text-white leading-tight">
              {comic.name}
            </h1>

            {/* Desktop/Laptop+: Keep meta visible */}
            <div className="hidden lg:block space-y-4">
              <div className="flex flex-wrap items-center justify-start gap-2 pt-2">
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm font-semibold text-slate-300">
                  {comic.status === "completed" ? "Hoàn thành" : "Đang tiến hành"}
                </span>
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm font-semibold text-slate-300">
                  Tác giả: {comic.author?.[0] || 'Đang cập nhật'}
                </span>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 justify-start">
                {comic.category?.map(cat => (
                  <span key={cat.id} className="text-xs font-semibold px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                    {cat.name}
                  </span>
                ))}
              </div>

              <div className="pt-4 text-left">
                <h3 className="flex items-center gap-2 font-semibold text-slate-100 text-lg mb-2">
                  <Info className="size-5 text-purple-400" />
                  Nội Dung
                </h3>
                <div
                  className="text-slate-400 leading-relaxed text-sm md:text-base bg-slate-950/40 p-4 rounded-xl border border-white/5"
                  dangerouslySetInnerHTML={{ __html: comic.content || "Chưa có nội dung mô tả." }}
                />
              </div>
            </div>

            {/* Mobile/Tablet: Collapsible meta */}
            <details className="group lg:hidden w-full">
              <summary className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-purple-300 cursor-pointer select-none [&::-webkit-details-marker]:hidden transition">
                Thông tin truyện
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-4 text-left">
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm font-semibold text-slate-300">
                    {comic.status === "completed" ? "Hoàn thành" : "Đang tiến hành"}
                  </span>
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-sm font-semibold text-slate-300">
                    Tác giả: {comic.author?.[0] || 'Đang cập nhật'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {comic.category?.map(cat => (
                    <span key={cat.id} className="text-xs font-semibold px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                      {cat.name}
                    </span>
                  ))}
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                  <h3 className="font-semibold text-slate-100 text-base mb-2">Nội Dung</h3>
                  <div
                    className="text-slate-400 leading-relaxed text-sm"
                    dangerouslySetInnerHTML={{ __html: comic.content || "Chưa có nội dung mô tả." }}
                  />
                </div>
              </div>
            </details>

            {/* Buttons */}
            {chapters.length > 0 && (
              <div className="pt-4 flex flex-row gap-3">
                <Link
                  to={`/comics/chapter/${encodeURIComponent(chapters[0].chapter_api_data)}`}
                  state={{ chapters, slug, thumb_url: `${IMAGE_CDN}${comic.thumb_url}` }}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-900/50 hover:scale-105"
                >
                  <BookOpen className="size-5" />
                  Đọc Từ Đầu
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      navigate("/login");
                      return;
                    }
                    toggleSave(comic);
                  }}
                  disabled={favLoading}
                  className={`inline-flex items-center justify-center flex-shrink-0 w-[48px] md:w-auto md:px-8 py-3 gap-2 rounded-xl font-bold transition-all border shadow-lg hover:scale-105 ${isSaved
                      ? "bg-red-500/10 border-red-500 text-red-500"
                      : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                    } ${favLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={isSaved ? "Hủy Yêu Thích" : "Yêu Thích"}
                  aria-label={isSaved ? "Hủy Yêu Thích" : "Yêu Thích"}
                >
                  <Heart className={`size-5 ${isSaved ? "fill-red-500" : ""}`} />
                  <span className="hidden md:inline">{isSaved ? "Hủy Yêu Thích" : "Yêu Thích"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <List className="size-7 text-purple-500" />
          <h2 className="text-2xl font-semibold uppercase text-slate-100">
            Danh Sách Chương
          </h2>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-inner relative max-h-[600px] overflow-y-auto custom-scrollbar">
          {chapters.length === 0 ? (
            <p className="text-center text-slate-500 py-10">Truyện chưa có chương nào.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {chapters.map((chap) => (
                <Link
                  key={chap.chapter_name}
                  to={`/comics/chapter/${encodeURIComponent(chap.chapter_api_data)}`}
                  state={{ chapters, slug, thumb_url: `${IMAGE_CDN}${comic.thumb_url}` }}
                  className="px-4 py-3 bg-slate-800/80 hover:bg-purple-600 rounded-xl text-center text-white font-semibold transition-colors shadow shadow-black/20 border border-white/5 truncate"
                >
                  Chương {chap.chapter_name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
