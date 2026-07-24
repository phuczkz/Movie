/* eslint-disable no-unused-vars */
import { motion, AnimatePresence } from "framer-motion";
/* eslint-enable no-unused-vars */
import { Check, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function AnnouncementModal({ announcement, onConfirm, onClose }) {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (announcement) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [announcement]);

  if (!announcement) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#141414] border-l-[6px] border-l-red-600 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col"
        >
          {/* Subtle Background Texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
              backgroundSize: '8px 8px'
            }}
          />

          <div className="relative p-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Header: Avatar & Logo */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-5 sm:gap-10 mb-2 pb-5 border-b border-white/5">
              {/* Avatar Image (Fallback to a random cute avatar if no local image) */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl sm:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl shrink-0 bg-[#0f0f0f] flex items-center justify-center">
                <img
                  src="/apple-touch-icon.png"
                  alt="Admin Avatar"
                  className="w-full h-full object-cover scale-[1.9]"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGxkMG41MHI0c2JwZnhlYnMyMzMxcWprdnhuYzN2emdpdGRmdWZ5dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/vPuszmHgeWnIhTkSr5/giphy.gif";
                  }}
                />
              </div>

              {/* Site Logo Text */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#14b875] flex items-center justify-center text-[#0a1128] shadow-lg shadow-[#14b875]/20 ring-1 ring-white/10">
                  <Play className="size-6 ml-1" fill="currentColor" strokeWidth={0} />
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-md">
                    <span className="text-white">Kho</span><span className="text-[#14b875]">Phim</span>
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 font-medium tracking-wide mt-0.5">
                    Kho Phim hay
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex flex-col gap-8 ${announcement.image ? 'lg:flex-row lg:items-start' : ''}`}>
              {/* Left Column (Title + Content) */}
              <div className={`flex-1 ${announcement.image ? 'lg:w-1/2 xl:w-3/5' : 'w-full'}`}>
                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 tracking-tight leading-snug text-center sm:text-left">
                  {announcement.title || "Thông báo từ Ban quản trị"}
                </h1>

                {/* Content (Rich Text) */}
                <div
                  className="prose prose-invert prose-lg max-w-none break-words
                             prose-p:text-[#b3b3b3] prose-p:leading-relaxed prose-p:mb-5 prose-p:text-base sm:prose-p:text-lg
                             prose-strong:text-white prose-strong:font-bold
                             prose-a:text-red-500 hover:prose-a:text-red-400
                             prose-img:rounded-xl prose-img:shadow-lg
                             [&>*:last-child]:mb-0 [&>*:first-child]:mt-0
                             overflow-x-hidden"
                  dangerouslySetInnerHTML={{ __html: announcement.content }}
                />
              </div>

              {/* Right Column (Image) */}
              {announcement.image && (
                <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col justify-center rounded-2xl overflow-hidden bg-black/40 border border-white/5 p-2 shadow-inner mt-4 lg:mt-0">
                  {announcement.movieSlug ? (
                    <Link
                      to={`/watch/${announcement.movieSlug}`}
                      onClick={handleConfirm}
                      className="group relative block rounded-xl overflow-hidden"
                      title="Click để xem phim ngay"
                    >
                      <img 
                        src={announcement.image} 
                        alt="Hình ảnh đính kèm" 
                        className="w-full h-auto max-h-[500px] object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <div className="size-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                          <Play className="size-8 ml-1" fill="currentColor" strokeWidth={0} />
                        </div>
                        <span className="font-bold text-white text-lg drop-shadow-md">Xem phim ngay</span>
                      </div>
                    </Link>
                  ) : (
                    <img 
                      src={announcement.image} 
                      alt="Hình ảnh đính kèm" 
                      className="w-full h-auto max-h-[500px] object-contain rounded-xl"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="relative px-6 sm:px-10 py-5 sm:py-6 bg-[#0f0f0f] border-t border-white/5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-center"
            >
              Đóng (Nhắc lại sau)
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.4)]"
            >
              {isConfirming ? (
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="size-5" />
              )}
              Đã hiểu & Xác nhận
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
