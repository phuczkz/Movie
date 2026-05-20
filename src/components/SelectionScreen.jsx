import { Film, BookOpen } from "lucide-react";
import { useAppMode } from "../context/AppModeContext";
import { useNavigate } from "react-router-dom";

export default function SelectionScreen() {
  const { setAppMode } = useAppMode();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 size-96 bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 size-96 bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-5xl md:text-7xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4 drop-shadow-sm">
          Chào mừng quay trở lại!
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto">
          Bạn muốn giải trí với loại hình nào hôm nay? Có thể thay đổi sau.
        </p>
      </div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        {/* Movie Option */}
        <button
          onClick={() => {
            setAppMode("movie");
            navigate("/");
          }}
          className="group relative p-1 rounded-3xl bg-slate-800/50 hover:bg-slate-800 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative h-full flex flex-col items-center justify-center p-12 bg-slate-900/80 rounded-[22px] border border-slate-700/50 group-hover:border-blue-500/50 transition-colors">
            <Film className="size-20 text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h2 className="text-3xl font-bold text-white mb-2">Xem Phim</h2>
            <p className="text-slate-400">Khám phá hàng ngàn bộ phim HD cực nét</p>
          </div>
        </button>

        {/* Comic Option */}
        <button
          onClick={() => {
            setAppMode("comic");
            navigate("/comics");
          }}
          className="group relative p-1 rounded-3xl bg-slate-800/50 hover:bg-slate-800 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative h-full flex flex-col items-center justify-center p-12 bg-slate-900/80 rounded-[22px] border border-slate-700/50 group-hover:border-purple-500/50 transition-colors">
            <BookOpen className="size-20 text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300" />
            <h2 className="text-3xl font-bold text-white mb-2">MangaHub</h2>
            <p className="text-slate-400">Thế giới truyện tranh đa dạng thể loại</p>
          </div>
        </button>
      </div>
    </div>
  );
}
