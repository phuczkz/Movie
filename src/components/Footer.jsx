import { Mail, Phone, MapPin, Facebook, Instagram, Youtube, Twitter, Film } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-12 border-t border-white/5 bg-slate-950/40 backdrop-blur-2xl">
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand & Description */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 group cursor-pointer w-fit">
              <div className="p-2 bg-primary/20 rounded-xl group-hover:bg-primary/30 transition-colors">
                <Film className="w-6 h-6 text-primary" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                Kho Phim
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-sm max-w-xs">
              Nền tảng xem phim trực tuyến chất lượng cao, mang đến trải nghiệm điện ảnh tuyệt vời nhất ngay tại nhà của bạn. Khám phá hàng ngàn bộ phim đa dạng thể loại.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 bg-slate-900/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300">
                <Facebook size={18} />
              </a>
              <a href="#" className="p-2 bg-slate-900/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300">
                <Instagram size={18} />
              </a>
              <a href="#" className="p-2 bg-slate-900/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300">
                <Youtube size={18} />
              </a>
              <a href="#" className="p-2 bg-slate-900/50 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300">
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-white font-semibold text-lg">Khám Phá</h3>
            <ul className="space-y-3">
              <li>
                <a href="/" className="text-slate-400 hover:text-primary text-sm transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-primary group-hover:scale-125 transition-all"></span>
                  Trang chủ
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-primary text-sm transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-primary group-hover:scale-125 transition-all"></span>
                  Phim Mới
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-primary text-sm transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-primary group-hover:scale-125 transition-all"></span>
                  Phim Bộ
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-primary text-sm transition-colors flex items-center gap-2 group">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-primary group-hover:scale-125 transition-all"></span>
                  Phim Lẻ
                </a>
              </li>
            </ul>
          </div>

          {/* Policy Links */}
          <div className="space-y-6">
            <h3 className="text-white font-semibold text-lg">Thông Tin</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-400 hover:text-primary text-sm transition-colors">Điều khoản dịch vụ</a></li>
              <li><a href="#" className="text-slate-400 hover:text-primary text-sm transition-colors">Chính sách bảo mật</a></li>
              <li><a href="#" className="text-slate-400 hover:text-primary text-sm transition-colors">Về chúng tôi</a></li>
              <li><a href="#" className="text-slate-400 hover:text-primary text-sm transition-colors">Liên hệ bản quyền</a></li>
            </ul>
          </div>

          {/* Contact Info - SEO optimized with address tag */}
          <div className="space-y-6">
            <h3 className="text-white font-semibold text-lg">Liên Hệ Doanh Nghiệp</h3>
            <address className="not-italic space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-primary mt-1 shrink-0" size={18} />
                <span className="text-slate-400 text-sm">
                  123 Đường Công Nghệ, Quận 1, TP. Hồ Chí Minh, Việt Nam
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-primary shrink-0" size={18} />
                <a href="tel:+84123456789" className="text-slate-400 hover:text-white text-sm transition-colors">
                  +84 123 456 789
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="text-primary shrink-0" size={18} />
                <a href="mailto:contact@moviespace.com" className="text-slate-400 hover:text-white text-sm transition-colors">
                  contact@moviespace.com
                </a>
              </div>
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {currentYear} MovieSpace. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/50 animate-pulse"></span>
              Server Status: Online
            </span>
            <p>Designed with ❤️ for Cinema Lovers</p>
          </div>
        </div>
      </div>

      {/* Decorative background element */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </footer>
  );
};

export default Footer;

