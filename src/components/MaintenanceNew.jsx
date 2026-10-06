import React from 'react';
import SEO from '@/components/SEO.jsx';

const MaintenanceNew = () => {
    return (
        <main
            role="main"
            aria-label="Hệ thống đang bảo trì"
            className="min-h-screen min-h-[100dvh] w-full bg-white flex items-center justify-center p-3 sm:p-6 md:p-8 lg:p-10 xl:p-12 2xl:p-16 min-[3200px]:p-24 overflow-hidden select-none"
        >
            <SEO title="Hệ thống đang bảo trì" description="Hệ thống đang trong quá trình nâng cấp và bảo trì định kỳ. Vui lòng quay lại sau." />

            <div className="w-full flex items-center justify-center max-w-[280px] min-[400px]:max-w-[340px] sm:max-w-[440px] md:max-w-xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl min-[2000px]:max-w-5xl min-[2800px]:max-w-6xl min-[3400px]:max-w-[1400px] transition-all duration-300">
                <img
                    src="/icons/404%20Error%20-%20Doodle%20animation.svg"
                    alt="Maintenance Animation"
                    className="w-full h-auto aspect-square max-h-[min(82dvh,82vw)] 2xl:max-h-[min(85dvh,85vw)] min-[3200px]:max-h-[min(88dvh,88vw)] object-contain pointer-events-none drop-shadow-sm"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                />
            </div>
        </main>
    );
};

export default MaintenanceNew;

