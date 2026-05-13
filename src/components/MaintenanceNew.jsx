import React, { useEffect, useState } from 'react';

const MaintenanceNew = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        // Force hide system cursor on body
        document.body.style.cursor = 'none';
        document.documentElement.style.cursor = 'none';

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            // Restore cursor
            document.body.style.cursor = 'auto';
            document.documentElement.style.cursor = 'auto';
        };
    }, []);

    return (
        <div className="maintenance-page relative w-full h-screen bg-white overflow-hidden font-['Outfit',sans-serif] select-none cursor-none">
            {/* Custom Sword Mouse Cursor */}
            <div
                className={`fixed pointer-events-none z-[9999] transition-transform duration-100 ease-out`}
                style={{
                    left: mousePos.x,
                    top: mousePos.y,
                    transform: `translate(-10%, -10%) scaleX(-1) rotate(${isHovering ? '15deg' : '0deg'}) scale(${isHovering ? 1.4 : 1})`,
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                }}
            >
                <img
                    src="/icons/sword-cursor.png"
                    alt="Sword Cursor"
                    className="w-12 h-12 object-contain"
                />
            </div>

            {/* Background Subtle Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/30 via-white to-white z-0" />

            {/* Header */}
            <header className="fixed top-0 left-0 w-full px-12 py-8 flex justify-between items-center z-50">
                <div
                    className="flex items-center gap-3 group cursor-none"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black text-2xl group-hover:rotate-12 transition-transform shadow-lg">k</div>
                    <span className="text-2xl font-black tracking-tight text-gray-900">khophim</span>
                </div>
                <nav className="hidden lg:flex items-center gap-10">
                    {['Phim Lẻ', 'Phim Bộ', 'Thể Loại', 'Quốc Gia'].map((item) => (
                        <a
                            key={item}
                            href="#"
                            className="text-sm font-bold text-gray-400 hover:text-black transition-colors tracking-wide uppercase cursor-none"
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                        >
                            {item}
                        </a>
                    ))}
                </nav>

            </header>

            {/* Content Section */}
            <main className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
                <div className="flex items-center gap-3 mb-10 animate-fade-in py-2 px-5 bg-gray-50 rounded-full border border-gray-100">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Nền tảng điện ảnh 4.0</span>
                </div>

                <h1
                    className="text-7xl md:text-9xl font-black text-gray-900 leading-[1] tracking-tighter mb-10 max-w-6xl animate-slide-up cursor-none"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    Trải nghiệm <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500">khophim</span> <br />
                    nâng tầm điện ảnh
                </h1>

                <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mb-14 leading-relaxed font-medium animate-slide-up delay-100">
                    Khám phá kho tàng phim khổng lồ với chất lượng 4K HDR. <br className="hidden md:block" />
                    Tốc độ truyền tải vượt trội, xem phim mượt mà mọi lúc mọi nơi.
                </p>

            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
                @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-slide-up { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in { animation: fadeIn 1.2s ease-out forwards; }
                .delay-100 { animation-delay: 0.15s; }
                .delay-200 { animation-delay: 0.3s; }
                
                /* Completely hide system cursor for EVERYTHING in this page */
                .maintenance-page, .maintenance-page * {
                    cursor: none !important;
                }
            `}} />
        </div>
    );
};

export default MaintenanceNew;
