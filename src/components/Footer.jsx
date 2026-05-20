import { Mail, Phone, MapPin, Facebook, Instagram, Youtube, Twitter, Film } from "lucide-react";
import { useStandalone } from "../hooks/useStandalone";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const isStandalone = useStandalone();

  if (isStandalone) return null;

  return (
    <footer className="relative z-10 mt-8 md:mt-12 border-t border-white/5 bg-slate-950/40 backdrop-blur-2xl">
      {/* SEO Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "MovieSpace",
          "url": window.location.origin,
          "logo": `${window.location.origin}/logo.png`,
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+84-123-456-789",
            "contactType": "customer service",
            "areaServed": "VN",
            "availableLanguage": "Vietnamese"
          },
          "sameAs": [
            "https://facebook.com/moviespace",
            "https://instagram.com/moviespace",
            "https://youtube.com/moviespace"
          ]
        })}
      </script>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-12">
          {/* Brand & Description */}
          <div className="space-y-5 md:space-y-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 group cursor-pointer w-fit">
              <div className="p-2 bg-primary/20 rounded-xl group-hover:bg-primary/30 transition-colors">
                <Film className="size-5 md:size-6 text-primary" />
              </div>
              <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                Kho Phim
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-sm max-w-sm">
              Nền tảng xem phim trực tuyến chất lượng cao, mang đến trải nghiệm điện ảnh tuyệt vời nhất ngay tại nhà của bạn. Khám phá hàng ngàn bộ phim đa dạng thể loại.
            </p>
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <button type="button" aria-label="Facebook" className="p-2 bg-slate-900/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300">
                <Facebook size={18} />
              </button>
              <button type="button" aria-label="Instagram" className="p-2 bg-slate-900/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300">
                <Instagram size={18} />
              </button>
              <button type="button" aria-label="Youtube" className="p-2 bg-slate-900/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300">
                <Youtube size={18} />
              </button>
              <button type="button" aria-label="Twitter" className="p-2 bg-slate-900/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300">
                <Twitter size={18} />
              </button>
            </div>
          </div>

          {/* Links Container */}
          <div className="grid grid-cols-2 gap-4 md:gap-8 sm:col-span-2 lg:col-span-2">
            {/* Quick Links */}
            <div className="space-y-4 md:space-y-6">
              <h3 className="text-white font-semibold text-base md:text-lg">Khám Phá</h3>
              <ul className="space-y-2 md:space-y-3">
                <li>
                  <a href="/" className="text-slate-400 hover:text-primary text-sm transition-colors flex items-center gap-2 group py-1">
                    <span className="size-1.5 rounded-full bg-slate-700 group-hover:bg-primary group-hover:scale-125 transition-all"></span>
                    Trang chủ
                  </a>
                </li>
                <li>
                  <button type="button" className="text-slate-400 hover:text-primary text-sm transition-colors flex items-center gap-2 group py-1 bg-transparent border-none w-full">
                    <span className="size-1.5 rounded-full bg-slate-700 group-hover:bg-primary group-hover:scale-125 transition-all"></span>
                    Phim Mới
                  </button>
                </li>
                <li>
                  <button type="button" className="text-slate-400 hover:text-primary text-sm transition-colors flex items-center gap-2 group py-1 bg-transparent border-none w-full">
                    <span className="size-1.5 rounded-full bg-slate-700 group-hover:bg-primary group-hover:scale-125 transition-all"></span>
                    Phim Bộ
                  </button>
                </li>
                <li>
                  <button type="button" className="text-slate-400 hover:text-primary text-sm transition-colors flex items-center gap-2 group py-1 bg-transparent border-none w-full">
                    <span className="size-1.5 rounded-full bg-slate-700 group-hover:bg-primary group-hover:scale-125 transition-all"></span>
                    Phim Lẻ
                  </button>
                </li>
              </ul>
            </div>

            {/* Policy Links */}
            <div className="space-y-4 md:space-y-6">
              <h3 className="text-white font-semibold text-base md:text-lg">Thông Tin</h3>
              <ul className="space-y-2 md:space-y-3">
                <li><button type="button" className="text-slate-400 hover:text-primary text-sm transition-colors block py-1 bg-transparent border-none">Điều khoản dịch vụ</button></li>
                <li><button type="button" className="text-slate-400 hover:text-primary text-sm transition-colors block py-1 bg-transparent border-none">Chính sách bảo mật</button></li>
                <li><button type="button" className="text-slate-400 hover:text-primary text-sm transition-colors block py-1 bg-transparent border-none">Về chúng tôi</button></li>
                <li><button type="button" className="text-slate-400 hover:text-primary text-sm transition-colors block py-1 bg-transparent border-none">Liên hệ bản quyền</button></li>
              </ul>
            </div>
          </div>

          {/* Contact Info - SEO optimized with address tag */}
          <div className="space-y-4 md:space-y-6 sm:col-span-2 lg:col-span-1">
            <h3 className="text-white font-semibold text-base md:text-lg">Liên Hệ Doanh Nghiệp</h3>
            <address className="not-italic space-y-3 md:space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-primary mt-0.5 shrink-0" size={18} />
                <span className="text-slate-400 text-sm leading-relaxed">
                  123 Đường Công Nghệ, Quận 1, TP. Hồ Chí Minh, Việt Nam
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-primary shrink-0" size={18} />
                <a href="tel:+84123456789" className="text-slate-400 hover:text-white text-sm transition-colors py-1 block">
                  +84 123 456 789
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="text-primary shrink-0" size={18} />
                <a href="mailto:contact@moviespace.com" className="text-slate-400 hover:text-white text-sm transition-colors py-1 block break-all">
                  contact@moviespace.com
                </a>
              </div>
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 md:pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 text-xs text-slate-500">
          <p className="text-center md:text-left">© {currentYear} MovieSpace. All rights reserved.</p>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-green-500/50 animate-pulse"></span>
              Server Status: Online
            </span>
          </div>
        </div>
      </div>

      {/* Decorative background element */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </footer>
  );
};

export default Footer;

