import { useParams, Link, useNavigate } from "react-router-dom";
import { usePersonDetail } from "../hooks/usePersonDetail";
import MovieCard from "../components/MovieCard";
import { MoveLeft, User } from "lucide-react";

const Actor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: person, isLoading } = usePersonDetail(id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="text-slate-400 font-medium animate-pulse">Đang tải thông tin diễn viên...</div>
      </div>
    );
  }

  if (!person || !person.name) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-slate-400 text-lg">Không tìm thấy thông tin diễn viên.</p>
        <button 
          onClick={() => navigate(-1)}
          className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          Quay lại trang trước
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <button 
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 font-medium transition-all group lg:mb-4"
      >
        <MoveLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Quay lại
      </button>

      <div className="flex flex-col md:flex-row gap-10 lg:gap-16 items-start">
        <div className="w-48 sm:w-60 md:w-64 lg:w-72 shrink-0 aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 bg-slate-900 group mx-auto md:mx-0 flex items-center justify-center">
          {person.profile_path ? (
            <img
              src={person.profile_path}
              alt={person.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <User className="w-1/3 h-1/3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          )}
        </div>

        <div className="flex-1 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-tight tracking-tight">
              {person.name}
            </h1>
            {person.place_of_birth && (
              <p className="text-emerald-400/90 font-semibold tracking-wide uppercase text-sm">
                {person.place_of_birth}
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              Tiểu sử
              <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></span>
            </h2>
            <div className="max-h-[16rem] overflow-y-auto pr-6 custom-scrollbar scroll-smooth">
              <p className="text-slate-300 leading-relaxed max-w-4xl text-lg whitespace-pre-wrap font-medium">
                {person.biography || `Chúng tôi chưa có thông tin tiểu sử chi tiết cho ${person.name}.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white tracking-tight">Phim đã tham gia</h2>
          <span className="text-slate-500 font-bold bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            {person.credits?.length || 0} Phim
          </span>
        </div>
        
        <div className="flex overflow-x-auto gap-6 sm:gap-8 pb-8 snap-x no-scrollbar custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {person.credits?.map((movie) => (
            <div key={movie.slug} className="min-w-[190px] sm:min-w-[240px] snap-start">
              <MovieCard movie={movie} />
            </div>
          ))}
          {(!person.credits || person.credits.length === 0) && (
            <p className="text-slate-500 font-medium py-10 w-full text-center">Chưa có dữ liệu phim cho diễn viên này.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Actor;
