import React from 'react';
import { useKKphimMovies } from '../hooks/useKKphimMovies.js';

const MaintenanceNew = () => {
    // Fetch latest movies for the 3D gallery
    const { data: movies = [] } = useKKphimMovies("latest");
    const galleryMovies = movies.slice(0, 8); // Top 8 movies

    return (
        <div className="maintenance-page relative w-full h-screen bg-[#050505] overflow-hidden font-['Outfit',sans-serif] select-none">
            {/* Background Subtle Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#050505] to-[#050505] z-0" />
            
            {/* Ambient Light Orbs */}
            <div className="ambient-orb orb-1" />
            <div className="ambient-orb orb-2" />
            <div className="ambient-orb orb-3" />

            {/* Header */}
            <header className="fixed top-0 left-0 w-full px-6 md:px-12 py-6 md:py-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="size-10 bg-green-500 rounded-xl flex items-center justify-center text-white font-black text-2xl group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(34,197,94,0.5)]">k</div>
                    <span className="text-2xl font-black tracking-tight text-white drop-shadow-md">khophim</span>
                </div>
                <nav className="hidden lg:flex items-center gap-10">
                    {['Phim Lẻ', 'Phim Bộ', 'Thể Loại', 'Quốc Gia'].map((item) => (
                        <button
                            key={item}
                            type="button"
                            className="text-sm font-bold text-gray-400 hover:text-white transition-colors tracking-wide uppercase cursor-pointer bg-transparent border-none"
                        >
                            {item}
                        </button>
                    ))}
                </nav>
            </header>

            {/* Content Section */}
            <main className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center pt-16">
                <div className="flex items-center gap-3 mb-8 animate-fade-in py-2 px-5 bg-white/5 backdrop-blur-md rounded-full border border-white/10 shadow-lg mt-8">
                    <div className="size-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">Nền tảng điện ảnh 4.0</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tighter mb-4 animate-slide-up drop-shadow-2xl">
                    Không gian <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">điện ảnh 3D</span>
                </h1>

                <p className="text-base md:text-lg text-gray-400 max-w-2xl mb-8 font-medium animate-slide-up delay-100">
                    Khám phá kho tàng phim mới nhất với hiệu ứng thị giác chân thực
                </p>

                {/* 3D Gallery */}
                <div className="gallery-wrapper animate-slide-up delay-200">
                    <div className="gallery-box">
                        {galleryMovies.length > 0 ? galleryMovies.map((m, index) => {
                            const angle = index * (360 / galleryMovies.length);
                            const primaryImg = m.thumb_url || m.poster_url;

                            return (
                            <span 
                                key={m.slug || index} 
                                className="gallery-item group"
                                style={{ transform: `rotateY(${angle}deg) translateZ(var(--gallery-radius, 340px))` }}
                            >
                                <img 
                                    src={primaryImg} 
                                    alt={m.name} 
                                    className="w-full h-full object-cover rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                                    onError={(e) => { 
                                        if (!e.target.dataset.fallback) {
                                            e.target.dataset.fallback = 'true';
                                            e.target.src = `https://img.ophim.live/uploads/movies/${m.slug}-thumb.jpg`;
                                        } else {
                                            e.target.src = '/apple-touch-icon.png';
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
                                <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 pointer-events-none transform translate-y-4 group-hover:translate-y-0">
                                    <h3 className="text-white text-[10px] sm:text-xs font-bold truncate drop-shadow-md">{m.name}</h3>
                                    <p className="text-blue-400 text-[8px] sm:text-[10px] font-semibold mt-0.5 drop-shadow-md">{m.year || "Mới"}</p>
                                </div>
                            </span>
                        )}) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex items-center gap-3 text-white/50 text-lg font-medium animate-pulse">
                                    <div className="size-5 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
                                    Đang tải kho phim...
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* oxc-disable-next-line react/no-danger */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in { animation: fadeIn 1.2s ease-out forwards; }
                .delay-100 { animation-delay: 0.15s; }
                .delay-200 { animation-delay: 0.3s; }
                
                /* --- Apple/Vercel Style Ambient Aurora --- */
                .ambient-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(120px);
                    opacity: 0.5;
                    z-index: 0;
                    pointer-events: none;
                    mix-blend-mode: screen;
                    will-change: transform;
                }
                .orb-1 {
                    top: -10%; left: 0%;
                    width: 50vw; height: 35vw;
                    background: rgba(16,185,129,0.4); /* Emerald Green */
                    animation: float1 7s infinite alternate ease-in-out;
                }
                .orb-2 {
                    bottom: -10%; right: 0%;
                    width: 60vw; height: 40vw;
                    background: rgba(20,184,166,0.3); /* Teal */
                    animation: float2 9s infinite alternate ease-in-out;
                }
                .orb-3 {
                    top: 20%; left: 20%;
                    width: 45vw; height: 45vw;
                    background: rgba(34,197,94,0.25); /* Bright Green */
                    animation: float3 11s infinite alternate ease-in-out;
                }
                @keyframes float1 {
                    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    100% { transform: translate(20vw, 15vh) scale(1.2) rotate(15deg); }
                }
                @keyframes float2 {
                    0% { transform: translate(0, 0) scale(1) rotate(0deg); }
                    100% { transform: translate(-20vw, -15vh) scale(1.3) rotate(-15deg); }
                }
                @keyframes float3 {
                    0% { transform: translate(0, 0) scale(1.3) rotate(0deg); }
                    100% { transform: translate(15vw, -10vh) scale(1) rotate(20deg); }
                }

                /* --- 3D Gallery CSS --- */
                .gallery-wrapper {
                    position: relative;
                    width: 100%;
                    height: 250px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    perspective: 1200px;
                    transform-style: preserve-3d;
                    margin-top: 1rem;
                }
                
                .gallery-box {
                    position: relative;
                    width: 140px;
                    height: 78px;
                    transform-style: preserve-3d;
                    animation: gallerySpin 30s linear infinite;
                    --gallery-radius: 200px;
                }
                
                .gallery-box:hover {
                    animation-play-state: paused;
                }
                
                .gallery-item {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    transform-origin: center;
                    transform-style: preserve-3d;
                    transition: filter 0.3s ease;
                    -webkit-box-reflect: below 15px linear-gradient(transparent, transparent, rgba(0,0,0,0.3));
                }
                
                /* Slight dimming for non-hovered items */
                .gallery-box:hover .gallery-item:not(:hover) {
                    filter: brightness(0.4) blur(1px);
                }
                
                @keyframes gallerySpin {
                    0% { transform: perspective(1200px) rotateY(0deg); }
                    100% { transform: perspective(1200px) rotateY(-360deg); } /* negative for right-to-left spin */
                }

                @media (min-width: 768px) {
                    .gallery-wrapper { height: 350px; margin-top: 2rem; }
                    .gallery-box { 
                        width: 200px; 
                        height: 112px; 
                        --gallery-radius: 280px;
                    }
                }
            `}} />
        </div>
    );
};

export default MaintenanceNew;
