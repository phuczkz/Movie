import { useState, useRef, useEffect } from "react";
import { Share2, Link2, Check, X } from "lucide-react";

const ShareButton = ({ title, text, url, className = "" }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const shareUrl = url || window.location.href;
  const shareTitle = title || document.title;
  const shareText = text || "";

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch {
        // User cancelled or error — fail silently
      }
      setShowMenu(false);
    } else {
      setShowMenu(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLinks = [
    {
      name: "Facebook",
      color: "bg-blue-600 hover:bg-blue-500",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      getUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Twitter",
      color: "bg-sky-500 hover:bg-sky-400",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      getUrl: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Telegram",
      color: "bg-cyan-500 hover:bg-cyan-400",
      icon: (
        <svg viewBox="0 0 24 24" className="size-4 fill-current">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      getUrl: () => `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={handleNativeShare}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${className || "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"}`}
        title="Chia sẻ"
        aria-label="Chia sẻ phim"
      >
        <Share2 className="size-4" />
        <span className="hidden sm:inline">Chia sẻ</span>
      </button>

      {/* Share menu (fallback for browsers without native share API) */}
      {showMenu && (
        <div className="absolute right-0 bottom-full mb-2 w-64 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
            <span className="text-sm font-semibold text-white">Chia sẻ</span>
            <button
              type="button"
              onClick={() => setShowMenu(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Social links */}
          <div className="flex gap-2 mb-3">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.getUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMenu(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-white text-xs font-semibold transition-all ${link.color}`}
                title={`Chia sẻ lên ${link.name}`}
              >
                {link.icon}
              </a>
            ))}
          </div>

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              copied
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
            }`}
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Đã sao chép!
              </>
            ) : (
              <>
                <Link2 className="size-4" />
                Sao chép liên kết
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
