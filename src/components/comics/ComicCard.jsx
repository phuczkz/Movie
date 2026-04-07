import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

/**
 * ComicCard component for displaying a comic with a frame synchronized with MovieCard.
 * @param {Object} props
 * @param {Object} props.comic - The comic object
 */
const ComicCard = ({ comic }) => {
  const IMAGE_CDN = import.meta.env.VITE_COMIC_IMAGE_CDN;
  const thumbUrl = comic.thumb_url?.startsWith('http') 
    ? comic.thumb_url 
    : `${IMAGE_CDN}${comic.thumb_url}`;

    // Use wsrv.nl proxy to optimize comic thumbnails as well
    const posterSrc = `https://wsrv.nl/?url=${encodeURIComponent(thumbUrl)}&output=webp&w=360&fit=cover&q=80`;

  const formatDate = (dateValue) => {
    if (!dateValue) return "Vừa xong";
    try {
      // Handle Firestore Timestamp
      if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString("vi-VN");
      }
      // Handle Date object or string
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return "Vừa xong";
      return d.toLocaleDateString("vi-VN");
    } catch {
      return "Vừa xong";
    }
  };

  return (
    <Link
      to={`/comics/${comic.slug}`}
      className="group relative flex flex-col transition hover:-translate-y-1"
    >
      <div className="aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-800 relative shadow-lg group-hover:shadow-purple-500/20 transition-all">
        <img
          src={posterSrc}
          alt={comic.name || "Comic"}
          className="absolute h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const currentSrc = e.currentTarget.src;
            if (currentSrc.includes("wsrv.nl")) {
              e.currentTarget.src = thumbUrl;
            } 
            else if (currentSrc === thumbUrl) {
              e.currentTarget.src = "https://placehold.co/400x600/1e293b/a855f7?text=No+Cover";
            }
          }}
        />
        
        {/* Comic-Specific Overlays */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 items-end">
            {/* Status Badge */}
            {comic.status && (
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-lg uppercase backdrop-blur-md ${
                comic.status === 'completed' 
                ? 'bg-emerald-500/90 text-slate-950' 
                : 'bg-purple-600/90 text-white'
            }`}>
                {comic.status === 'completed' ? 'Full' : 'Ongoing'}
            </div>
            )}
        </div>

        {/* Latest Chapter Badge (Bottom left) */}
        {comic.chaptersLatest && comic.chaptersLatest.length > 0 && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-bold border border-white/10 text-white z-10 transition-transform group-hover:-translate-y-[2px]">
            CH. {comic.chaptersLatest[0].chapter_name}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      </div>

      <div className="mt-4 flex flex-col items-center text-center px-1">
        <h3 className="text-[17px] font-semibold text-white line-clamp-1 group-hover:text-purple-400 transition-colors">
          {comic.name || "Truyện không tên"}
        </h3>
        <p className="text-[15px] font-medium text-slate-400 line-clamp-1 mt-1 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatDate(comic.updatedAt)}
        </p>
      </div>
    </Link>
  );
};

export default ComicCard;
