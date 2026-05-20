import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Home, ChevronLeft, ChevronRight, EyeOff, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase.config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { comicApi } from "../../api/comicApi";

let blurIdCounter = 0;

export default function ComicReader() {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUrl = decodeURIComponent(chapterId);
  const { chapters: stateChapters, slug, thumb_url } = location.state || {}; // Add thumb_url if available
  const { user } = useAuth();
  
  const { data: detailData } = useQuery({
    queryKey: ["comicDetail", slug],
    queryFn: () => comicApi.getDetail(slug),
    enabled: !stateChapters && !!slug,
  });

  const chapters = stateChapters || detailData?.data?.item?.chapters?.[0]?.server_data || null;

  const [eraserMode, setEraserMode] = useState(false);
  const [blurBoxes, setBlurBoxes] = useState([]);
  
  const [showChapters, setShowChapters] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowChapters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentChapterIndex = chapters?.findIndex(c => c.chapter_api_data === fetchUrl);
  const hasPrev = currentChapterIndex > 0;
  const hasNext = chapters && currentChapterIndex !== -1 && currentChapterIndex < chapters.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      navigate(`/comics/chapter/${encodeURIComponent(chapters[currentChapterIndex - 1].chapter_api_data)}`, { state: { ...location.state, chapters } });
    }
  };

  const handleNext = () => {
    if (hasNext) {
      navigate(`/comics/chapter/${encodeURIComponent(chapters[currentChapterIndex + 1].chapter_api_data)}`, { state: { ...location.state, chapters } });
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [fetchUrl]);

  const { data: chapterRes, isLoading, error } = useQuery({
    queryKey: ["comicChapter", fetchUrl],
    queryFn: () => comicApi.getChapter(fetchUrl),
  });

  const activeChapterRef = useRef(null);

  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsHidden(true);
      } else if (currentScrollY < lastScrollY.current) {
        setIsHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (showChapters && activeChapterRef.current) {
      activeChapterRef.current.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [showChapters]);

  // Lưu lịch sử đọc truyện
  useEffect(() => {
    if (user && db && slug && chapterRes?.data?.item?.comic_name) {
      const { item } = chapterRes.data;
      const { chapter_name, comic_name } = item;
      
      const saveHistory = async () => {
        try {
          await setDoc(doc(db, `users/${user.uid}/ComicProgress`, slug), {
            slug,
            comicName: comic_name,
            chapterName: chapter_name,
            chapterApiUrl: fetchUrl,
            posterUrl: thumb_url || "", // Fallback if thumb_url is not in state
            updatedAt: serverTimestamp(),
            type: 'comic'
          }, { merge: true });
        } catch (error) {
          console.error("Error saving comic history:", error);
        }
      };
      saveHistory();
    }
  }, [user, slug, chapterRes, fetchUrl, thumb_url]);

  const { domain_cdn, item } = chapterRes?.data || {};
  const { chapter_path, chapter_image, chapter_name, comic_name } = item || {};

  // Optimizing performance by preconnecting to the CDN
  useEffect(() => {
    if (domain_cdn) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = domain_cdn;
      document.head.appendChild(preconnect);
      
      const dnsPrefetch = document.createElement("link");
      dnsPrefetch.rel = "dns-prefetch";
      dnsPrefetch.href = domain_cdn;
      document.head.appendChild(dnsPrefetch);

      return () => {
        document.head.removeChild(preconnect);
        document.head.removeChild(dnsPrefetch);
      };
    }
  }, [domain_cdn]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="size-10 text-purple-500 animate-spin" />
        <p className="text-slate-300 font-semibold animate-pulse">Đang tải ảnh truyện...</p>
      </div>
    );
  }

  if (error || !chapterRes?.data?.item) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <p className="text-red-400">Có lỗi xảy ra khi tải chương truyện này.</p>
        <button onClick={() => navigate(slug ? `/comics/${slug}` : '/comics')} className="text-purple-400 hover:text-purple-300 underline">
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500 bg-black min-h-screen">

      <div className={`sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-lg shadow-black/50 overflow-hidden transition-transform duration-300 ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white flex flex-shrink-0"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="text-center flex-1 truncate px-4">
          <h1 className="text-sm md:text-base font-bold text-slate-100 truncate">{comic_name}</h1>
          <p className="text-xs font-semibold text-purple-400">Chương {chapter_name}</p>
        </div>
        <div className="w-9" />
      </div>


      {/* Eraser Mode Banner Hint */}
      {eraserMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/90 text-white px-6 py-2 rounded-full font-medium text-sm md:text-base whitespace-nowrap shadow-[0_0_20px_rgba(79,70,229,0.5)] animate-in slide-in-from-top-4 backdrop-blur-md border border-white/20 pointer-events-none">
          Chạm vào quảng cáo để làm mờ nó
        </div>
      )}

      {/* Image Container with removed padding on mobile/tablet */}
      <div className="flex flex-col items-center min-h-screen mt-4 shadow-2xl bg-black -mx-4 w-[calc(100%+32px)] md:-mx-6 md:w-[calc(100%+48px)] lg:mx-0 lg:w-full">
        {chapter_image && chapter_image.length > 0 ? (
          chapter_image.map((img, index) => {
            const imgSrc = `${domain_cdn}/${chapter_path}/${img.image_file}`;
            const isPriority = index < 2; // Priority load for first 2 pages
            return (
              <div key={`${img.image_page}-${img.image_file}`} className={`w-full relative bg-slate-900/10 min-h-[400px] overflow-hidden block ${index !== 0 ? '-mt-[1px]' : ''}`}>
                <img
                  src={imgSrc}
                  alt={`Trang ${img.image_page}`}
                  loading={isPriority ? "eager" : "lazy"}
                  fetchPriority={isPriority ? "high" : "auto"}
                  decoding="async"
                  className={`w-full h-auto block m-0 p-0 align-top transition-opacity duration-300 ${eraserMode ? 'cursor-crosshair' : ''}`}
                  onClick={(e) => {
                    if (!eraserMode) return;
                    const rect = e.target.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const topRatio = y / rect.height;
                    setBlurBoxes(prev => [...prev, { id: ++blurIdCounter, index, topRatio }]);
                  }}
                  onLoad={(e) => {
                    const { naturalWidth, naturalHeight } = e.target;
                    // Detect banner ads (very wide and short images)
                    if (naturalWidth && naturalHeight && (naturalWidth / naturalHeight >= 2.5)) {
                      e.target.parentElement.style.display = 'none';
                    }
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.display = 'none';
                  }}
                />

                {/* Render Blur Overlays */}
                {blurBoxes.filter(b => b.index === index).map((box) => (
                  <div
                    key={box.id}
                    style={{ top: `calc(${box.topRatio * 100}%)`, transform: 'translateY(-50%)' }}
                    className="absolute left-0 w-full aspect-[6/1] backdrop-blur-xl bg-black/90 z-20 flex items-center justify-center group flex-col shadow-[0_0_20px_rgba(0,0,0,0.8)] border-y border-white/10"
                  >
                    <p className="text-white/40 text-[10px] md:text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity select-none">
                      Quảng cáo đã che
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBlurBoxes(prev => prev.filter(b => b.id !== box.id));
                      }}
                      className="absolute top-2 right-2 p-1.5 md:p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Xóa làm mờ"
                    >
                      <X className="size-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <p>Không tìm thấy hình ảnh nào trong chương này.</p>
          </div>
        )}
      </div>

      {/* Footer / Done Reading - Added padding for bottom fixed bar */}
      <div className="text-center pt-8 pb-32 sm:pb-36 px-4">
        <p className="text-slate-400 text-sm font-semibold mb-4">Hết chương {chapter_name}</p>
        <div className="flex flex-row flex-nowrap items-center justify-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate(slug ? `/comics/${slug}` : '/comics')}
            className="px-4 sm:px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-200 transition-colors font-medium border border-white/10 shadow-lg text-[13px] sm:text-base whitespace-nowrap"
          >
            Danh sách chương
          </button>
          {hasNext && (
            <button
              onClick={handleNext}
              className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full text-white transition-all font-bold shadow-lg shadow-purple-900/50 flex items-center justify-center gap-1 sm:gap-2 hover:scale-105 text-[13px] sm:text-base whitespace-nowrap"
            >
              Chương tiếp <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar - Optimized for mobile safe areas */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1e2022]/98 backdrop-blur-md shadow-[0_-5px_20px_rgba(0,0,0,0.5)] border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto px-2 py-1.5 md:py-2 flex items-center justify-center gap-1 md:gap-3">
          <button
            onClick={() => navigate(slug ? `/comics/${slug}` : '/comics')}
            className="p-1.5 text-slate-300 hover:text-white transition-colors flex-shrink-0"
            title="Trang chủ truyện"
          >
            <Home className="size-5 md:w-6 md:h-6" />
          </button>
          
          {/* Ad Eraser Button */}
          <button
            onClick={() => setEraserMode(!eraserMode)}
            className={`p-1.5 rounded-full transition-colors flex-shrink-0 relative ${eraserMode ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'text-slate-400 hover:text-white'}`}
            title="Bật/Tắt Cục Tẩy Quảng Cáo"
          >
            <EyeOff className="size-5 md:w-6 md:h-6" />
            {eraserMode && (
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-3 bg-indigo-500"></span>
              </span>
            )}
          </button>
          
          <button
            onClick={handlePrev}
            disabled={!hasPrev || !chapters}
            className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${(hasPrev && chapters) ? 'bg-white/10 hover:bg-white/20 text-white' : 'text-slate-600 cursor-not-allowed'}`}
            title="Chương trước"
          >
            <ChevronLeft className="size-5 md:w-6 md:h-6" />
          </button>
          
          <div className="relative" ref={dropdownRef}>
            {chapters && chapters.length > 0 ? (
              <>
                <button
                  onClick={() => setShowChapters(!showChapters)}
                  className="w-28 md:w-36 bg-white text-black font-bold border-0 rounded py-1 md:py-1.5 px-2 outline-none text-xs md:text-sm cursor-pointer flex justify-between items-center shadow-md select-none hover:bg-slate-50 transition-colors"
                >
                  <span className="truncate text-center flex-1">Chương {chapter_name}</span>
                  <ChevronRight className={`w-3.5 h-3.5 ml-1 flex-shrink-0 transition-transform duration-300 ${showChapters ? '-rotate-90 text-slate-800' : 'rotate-90 text-slate-400'}`} />
                </button>
                
                {showChapters && (
                  <div 
                    className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-40 md:w-48 bg-white rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] z-[60] flex flex-col py-1 overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-2 fade-in"
                    style={{ maxHeight: '400px' }} 
                  >
                    {chapters.map(chap => {
                      const isActive = chap.chapter_api_data === fetchUrl;
                      return (
                        <button
                          key={chap.chapter_api_data}
                          ref={isActive ? activeChapterRef : null}
                          onClick={() => {
                            navigate(`/comics/chapter/${encodeURIComponent(chap.chapter_api_data)}`, { state: { ...location.state, chapters } });
                            setShowChapters(false);
                          }}
                          className={`px-4 py-3 text-center hover:bg-indigo-50 transition-colors text-sm md:text-base border-b border-slate-100 last:border-0 ${isActive ? 'bg-indigo-100 text-indigo-700 font-extrabold shadow-inner' : 'text-slate-800 font-semibold'}`}
                        >
                          Chương {chap.chapter_name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="w-28 md:w-36 bg-slate-200 text-slate-500 font-semibold border-0 rounded py-1 md:py-1.5 px-2 text-xs md:text-sm text-center cursor-not-allowed shadow-md truncate">
                Chương {chapter_name}
              </div>
            )}
          </div>
          
          <button
            onClick={handleNext}
            disabled={!hasNext || !chapters}
            className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${(hasNext && chapters) ? 'bg-white text-black hover:bg-slate-200' : 'bg-white/10 text-slate-600 cursor-not-allowed'}`}
            title="Chương sau"
          >
            <ChevronRight className="size-5 md:w-6 md:h-6" />
          </button>
          
        </div>
      </div>
    </div>
  );
}
