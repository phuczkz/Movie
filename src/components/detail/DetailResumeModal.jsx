import { Play } from "lucide-react";
import { getHiRes, formatTime } from "./detailUtils.js";

const DetailResumeModal = ({ show, resumeData, movie, onResume, onStartFromBeginning }) => {
  if (!show || !resumeData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Background Poster Full Width */}
        {(movie?.thumb_url || movie?.poster_url) && (
          <div className="absolute inset-0 z-0">
            <img
              src={getHiRes(movie?.poster_url || movie?.thumb_url)}
              alt="cover"
              className="h-full w-full object-cover object-top opacity-100"
            />
            {/* Gradient masks to make text readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
          </div>
        )}

        {/* Modal Content */}
        <div className="relative z-10 px-6 pb-6 pt-36 text-center">
          <h3 className="mb-2 text-xl font-bold text-white tracking-tight drop-shadow-md">
            Tiếp tục xem phim?
          </h3>
          <p className="text-sm font-medium text-slate-200 drop-shadow-md">
            Bạn đang xem{" "}
            {resumeData.episodeName === "Full" ||
            resumeData.episodeName === "Tập Full" ||
            !resumeData.episodeName
              ? "Tập Full"
              : resumeData.episodeName.toLowerCase().startsWith("tập")
              ? resumeData.episodeName
              : `Tập ${resumeData.episodeName}`}{" "}
            - phút {formatTime(resumeData.currentTime)} /{" "}
            {formatTime(resumeData.duration)}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-[2px] hover:bg-emerald-400 active:scale-[0.98]"
            >
              <Play
                className="h-4 w-4 transition-transform group-hover:scale-110"
                fill="currentColor"
              />
              Có, tiếp tục xem
            </button>
            <button
              type="button"
              onClick={onStartFromBeginning}
              className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-md px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              Tôi muốn xem từ đầu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailResumeModal;
