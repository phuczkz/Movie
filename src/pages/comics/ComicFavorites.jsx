import { Link } from 'react-router-dom';
import { Heart, BookOpen, Trash2, LogIn } from 'lucide-react';
import { useSavedComicsList } from '../../hooks/useSavedComicsList';
import { useAuth } from '../../context/AuthContext.jsx';
import ComicCard from '../../components/comics/ComicCard';

export default function ComicFavorites() {
  const { user } = useAuth();
  const { comics, loading, error } = useSavedComicsList();
  const { removeSavedComic } = useAuth();

  if (!user) {
    return (
      <div className="animate-in fade-in duration-700 min-h-[60vh] flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="size-24 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-8 relative">
          <Heart className="size-10 text-slate-600" />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 p-2 rounded-full shadow-lg">
            <LogIn className="size-4 text-amber-950" />
          </div>
        </div>
        <h1 className="text-3xl font-semibold text-white uppercase mb-4 tracking-tight">Vui lòng đăng nhập</h1>
        <p className="text-slate-400 max-w-md mb-10 leading-relaxed text-lg">
          Bạn cần đăng nhập để xem danh sách truyện yêu thích cũng như đồng bộ hóa chúng trên tất cả các thiết bị.
        </p>
        <Link 
          to="/login" 
          className="px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-xl shadow-purple-900/30 hover:scale-105 transition-all text-lg flex items-center gap-3"
        >
          <LogIn className="size-5" />
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 min-h-[60vh] pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
            <Heart className="size-8 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-white uppercase tracking-tight">
              Truyện Yêu Thích
            </h1>
            <p className="text-slate-400 font-medium">
              Bạn có <span className="text-purple-400">{comics.length}</span> bộ truyện trong danh sách
            </p>
          </div>
        </div>
        
        <Link 
          to="/comics" 
          className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all font-semibold flex items-center gap-2"
        >
          <BookOpen className="size-4" />
          Khám phá thêm
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
           <div className="loader-orbit" />
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center">
          Đã có lỗi xảy ra khi tải danh sách. Vui lòng thử lại sau.
        </div>
      ) : comics.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center">
          <div className="size-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
            <Heart className="size-10 text-slate-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-200 mb-2">Chưa có truyện yêu thích</h2>
          <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
            Hãy nhấn vào biểu tượng trái tim ở trang chi tiết truyện để lưu lại những bộ truyện mà bạn yêu thích nhé!
          </p>
          <Link 
            to="/comics" 
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-900/20 hover:scale-105 transition-all"
          >
            Đến MangaHub ngay
          </Link>
        </div>
      ) : (
        <div className="grid-movies">
          {comics.map((comic) => (
            <div key={comic.slug} className="relative group">
              <ComicCard comic={comic} />
              
              {/* Quick remove button */}
              <button
                type="button"
                onClick={() => removeSavedComic(comic.slug)}
                className="absolute top-2 left-2 z-20 p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:border-red-500 transition-all"
                title="Xóa khỏi yêu thích"
                aria-label="Xóa khỏi yêu thích"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
