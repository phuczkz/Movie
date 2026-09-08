import { useState, useEffect, useRef } from "react";
import { X, Star, CheckCircle2, LogIn, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '@/features/auth/context/AuthContext';

const RATING_LEVELS = [
  {
    score: 5,
    label: "Tuyệt vời",
    sub: "Cực phẩm, rất đáng xem!",
    emoji: "😍",
    activeColor: "border-emerald-400/90 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40",
    badgeColor: "bg-emerald-500 text-slate-950",
  },
  {
    score: 4,
    label: "Phim hay",
    sub: "Nội dung cuốn, xem đã",
    emoji: "😊",
    activeColor: "border-teal-400/80 bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/30",
    badgeColor: "bg-teal-500 text-slate-950",
  },
  {
    score: 3,
    label: "Khá ổn",
    sub: "Giải trí vừa vặn, xem được",
    emoji: "😐",
    activeColor: "border-sky-400/80 bg-sky-400/15 text-sky-200 ring-1 ring-sky-400/30",
    badgeColor: "bg-sky-400 text-slate-950",
  },
  {
    score: 2,
    label: "Chưa hay",
    sub: "Hơi thất vọng, còn nhiều sạn",
    emoji: "😕",
    activeColor: "border-orange-400/80 bg-orange-400/15 text-orange-200 ring-1 ring-orange-400/30",
    badgeColor: "bg-orange-400 text-slate-950",
  },
  {
    score: 1,
    label: "Dở tệ",
    sub: "Không như kỳ vọng, phí thời gian",
    emoji: "😫",
    activeColor: "border-rose-400/80 bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/30",
    badgeColor: "bg-rose-400 text-white",
  },
];

export default function RatingModal({
  isOpen,
  onClose,
  movieTitle = "",
  ratingData,
}) {
  const { user } = useAuth();
  const {
    average = 0,
    totalRatings = 0,
    userRating = 0,
    submitRating,
    submitting,
  } = ratingData || {};

  const [selectedScore, setSelectedScore] = useState(5);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const modalRef = useRef(null);

  // Khởi tạo điểm cũ của user khi mở modal
  useEffect(() => {
    if (isOpen) {
      setSelectedScore(userRating > 0 ? userRating : 5);
      setStatusMessage(null);
      setIsSuccess(false);
      // Khóa cuộn trang
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, userRating]);

  // Phím ESC để đóng
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeLevel = RATING_LEVELS.find((l) => l.score === selectedScore) || RATING_LEVELS[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setStatusMessage("Vui lòng đăng nhập để gửi đánh giá phim.");
      return;
    }

    try {
      setStatusMessage(null);
      const res = await submitRating({
        rating: selectedScore,
      });

      if (res?.success) {
        setIsSuccess(true);
        setStatusMessage("Đã gửi đánh giá thành công. Cảm ơn bạn!");
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Không thể gửi đánh giá. Vui lòng thử lại sau.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full sm:max-w-md bg-[#12131d] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-slideUp sm:animate-zoomIn"
      >
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-white/5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                Đánh giá phim
              </span>
              {totalRatings > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-300 font-medium">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <strong className="text-white">{average}</strong>/5
                  <span className="text-slate-500">({totalRatings} lượt)</span>
                </span>
              ) : (
                <span className="text-xs text-slate-400">Chưa có đánh giá</span>
              )}
            </div>
            <h2
              id="rating-modal-title"
              className="mt-2 text-lg sm:text-xl font-bold text-white leading-snug line-clamp-1"
            >
              {movieTitle || "Bộ phim này"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition shrink-0 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nội dung form */}
        <div className="px-6 py-5 space-y-5">
          {/* Lời nhắc nếu chưa đăng nhập */}
          {!user ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-emerald-200">
                <p className="font-semibold text-emerald-100">Bạn chưa đăng nhập</p>
                <p className="text-emerald-200/80 mt-0.5">Đăng nhập để chia sẻ cảm nhận cùng cộng đồng.</p>
              </div>
              <Link
                to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
              >
                <LogIn className="size-3.5" />
                Đăng nhập
              </Link>
            </div>
          ) : userRating > 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2 flex items-center justify-between text-xs text-slate-300">
              <span>Bạn đã từng đánh giá bộ phim này ({userRating} sao)</span>
              <span className="text-emerald-300 font-medium">Có thể cập nhật lại</span>
            </div>
          ) : null}

          {/* Chọn mức đánh giá (5 levels) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Chọn mức độ hài lòng
            </label>

            {/* Grid 5 mức cảm xúc */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {RATING_LEVELS.map((level) => {
                const isSelected = selectedScore === level.score;
                return (
                  <button
                    key={level.score}
                    type="button"
                    onClick={() => setSelectedScore(level.score)}
                    className={`flex flex-col items-center justify-center py-2.5 sm:py-3 px-1 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? `${level.activeColor} scale-105 shadow-md`
                        : "border-white/5 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:bg-white/[0.06] hover:text-slate-200"
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1 select-none transition-transform hover:scale-110">
                      {level.emoji}
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold line-clamp-1">
                      {level.label}
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-400 font-mono">
                      {level.score}★
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Banner mô tả cảm xúc đang chọn */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">{activeLevel.emoji}</span>
                <span className="font-semibold text-white">{activeLevel.label}</span>
                <span className="text-slate-400 font-normal">({activeLevel.score}/5 sao):</span>
                <span className="text-emerald-200/90 hidden sm:inline italic">
                  "{activeLevel.sub}"
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-3 ${
                      selectedScore >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Thông báo trạng thái */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                isSuccess
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
              }`}
            >
              {isSuccess && <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || isSuccess}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang gửi...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="size-4" />
                Đã đánh giá
              </>
            ) : (
              "Gửi đánh giá"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
