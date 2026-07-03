import React from 'react';

const VietnamBanner = () => {
  return (
    <div className="w-full py-1 flex justify-center !mt-0">
      <div className="relative w-full overflow-hidden rounded-xl border border-white/5 bg-gradient-to-r from-[#3a221f] via-[#1a1515] to-[#121214] p-2 sm:p-4 lg:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex flex-row items-center justify-center gap-2 sm:gap-4 lg:gap-6 group hover:border-white/10 transition-all duration-500 flex-nowrap">

        {/* Glow effect */}
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.15),transparent_100%)]" />

        {/* Flag Section */}
        <div className="relative z-10 flex-shrink-0">
          <div className="w-[85px] h-[53px] min-[375px]:w-[100px] min-[375px]:h-[62px] sm:w-[130px] sm:h-[80px] md:w-[150px] md:h-[95px] lg:w-[180px] lg:h-[110px] rounded-md overflow-hidden relative shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
            <img
              src="https://i.ytimg.com/vi/GQgyCJWQhsI/maxresdefault.jpg"
              alt="Cờ Việt Nam"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Vignette / grunge overlay effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.6))]" />
            <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-12 lg:h-16 w-px bg-white/20 relative z-10" />

        {/* Text Section */}
        <div className="relative z-10 flex flex-col justify-center text-left">
          <h2 className="text-[9px] min-[375px]:text-[11px] min-[425px]:text-[13px] sm:text-[16px] md:text-[22px] lg:text-[28px] font-bold italic tracking-wide text-white drop-shadow-md leading-relaxed whitespace-nowrap">
            HOÀNG SA,TRƯỜNG SA là của <span className="text-[#ffb6b6] drop-shadow-[0_0_10px_rgba(255,182,182,0.3)]">VIỆT NAM</span>
          </h2>
        </div>

      </div>
    </div>
  );
};

export default VietnamBanner;
