const MaintenanceIllustration = () => (
  <div className="relative w-full flex items-center justify-center p-4">
    <svg
      viewBox="0 0 800 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto max-w-2xl drop-shadow-xl animate-in fade-in zoom-in duration-700"
    >
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes cloud-move {
             0% { transform: translateX(0); }
             100% { transform: translateX(30px); }
          }
          @keyframes shimmer {
             0% { opacity: 0.3; }
             50% { opacity: 0.7; }
             100% { opacity: 0.3; }
          }
          @keyframes pulse-soft {
             0%, 100% { opacity: 0.8; }
             50% { opacity: 1; }
          }
          .animate-window { animation: float 4s ease-in-out infinite; }
          .animate-cloud { animation: cloud-move 12s ease-in-out infinite alternate; }
          .animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
          .animate-screen { animation: pulse-soft 3s ease-in-out infinite; }
          .delay-1 { animation-delay: 0.5s; }
          .delay-2 { animation-delay: 1s; }
        `}
      </style>

      {/* Decorative Clouds */}
      <g className="animate-cloud" opacity="0.4">
        <path d="M50 80Q60 60 80 60T110 80T140 60T170 80H50Z" fill="#CBD5E1" />
        <path
          d="M650 60Q660 40 680 40T710 60T740 40T770 60H650Z"
          fill="#CBD5E1"
          className="delay-1"
        />
        <path
          d="M380 30Q390 10 410 10T440 30T470 10T500 30H380Z"
          fill="#CBD5E1"
          className="delay-2"
        />
      </g>

      {/* Crane Structure Background */}
      <g stroke="#94A3B8" strokeWidth="4" opacity="0.3">
        <path d="M400 0V450" />
        <path d="M380 0V450" />
        <path d="M420 0V450" />
        <path d="M360 0L440 80" />
        <path d="M440 0L360 80" />
        <path d="M360 80L440 160" />
        <path d="M440 80L360 160" />
      </g>

      {/* Monitor (iMac style) - Centered at 400 */}
      <g transform="translate(225, 180)">
        {/* Stand */}
        <path
          d="M140 180L210 180L225 210L125 210Z"
          fill="white"
          stroke="#E2E8F0"
          strokeWidth="1"
        />
        {/* Frame / Bezel (350 width) */}
        <rect
          x="0"
          y="0"
          width="350"
          height="200"
          rx="8"
          fill="white"
          stroke="#E2E8F0"
          strokeWidth="1"
        />
        <rect
          x="5"
          y="5"
          width="340"
          height="170"
          rx="4"
          fill="#2d3748"
          className="animate-screen"
        />
        <circle cx="175" cy="188" r="5" fill="#CBD5E1" opacity="0.5" />

        {/* Floating Window Cover (Moving part) - 300 width */}
        <g transform="translate(40, -40)" className="animate-window">
          <rect
            width="300"
            height="160"
            rx="6"
            fill="white"
            className="shadow-2xl"
            stroke="#E2E8F0"
            strokeWidth="1"
          />
          {/* Header of box */}
          <rect width="300" height="30" rx="6" fill="#FB923C" />
          <g transform="translate(15, 15)">
            <circle cx="0" cy="0" r="3.5" fill="#EF4444" />
            <circle cx="12" cy="0" r="3.5" fill="#FBBF24" />
            <circle cx="24" cy="0" r="3.5" fill="#22C55E" />
          </g>
          <rect
            x="55"
            y="10"
            width="220"
            height="10"
            rx="5"
            fill="white"
            opacity="0.8"
          />

          <rect
            x="20"
            y="50"
            width="110"
            height="90"
            rx="4"
            fill="#F1F5F9"
            className="animate-shimmer"
          />
          <g transform="translate(145, 60)">
            <rect
              width="135"
              height="6"
              rx="3"
              fill="#E2E8F0"
              className="animate-shimmer"
            />
            <rect
              y="15"
              width="135"
              height="6"
              rx="3"
              fill="#E2E8F0"
              className="animate-shimmer delay-1"
            />
            <rect y="30" width="135" height="6" rx="3" fill="#F1F5F9" />
            <rect y="45" width="135" height="6" rx="3" fill="#F1F5F9" />
            <rect y="60" width="135" height="6" rx="3" fill="#F1F5F9" />

            <g transform="translate(0, 80)">
              <circle
                cx="10"
                cy="0"
                r="10"
                fill="#FB923C"
                className="animate-shimmer"
              />
              <circle
                cx="45"
                cy="0"
                r="10"
                fill="white"
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <circle
                cx="80"
                cy="0"
                r="10"
                fill="#FB923C"
                className="animate-shimmer delay-2"
              />
            </g>
          </g>
        </g>
      </g>

      {/* Barriers */}
      <g transform="translate(150, 360)">
        <rect x="0" y="0" width="120" height="8" fill="#1E293B" />
        <rect x="0" y="8" width="5" height="50" fill="#1E293B" />
        <rect x="115" y="8" width="5" height="50" fill="#1E293B" />
        <g clipPath="inset(0 0 0 0)">
          <rect width="120" height="8" fill="#FB923C" />
          <path
            d="M0 0 L15 0 L25 8 L10 8 Z M35 0 L50 0 L60 8 L45 8 Z M70 0 L85 0 L95 8 L80 8 Z M105 0 L120 0 L130 8 L115 8 Z"
            fill="white"
          />
        </g>
      </g>

      <g transform="translate(530, 360)">
        <rect x="0" y="0" width="120" height="8" fill="#1E293B" />
        <rect x="0" y="8" width="5" height="50" fill="#1E293B" />
        <rect x="115" y="8" width="5" height="50" fill="#1E293B" />
        <g clipPath="inset(0 0 0 0)">
          <rect width="120" height="8" fill="#FB923C" />
          <path
            d="M0 0 L15 0 L25 8 L10 8 Z M35 0 L50 0 L60 8 L45 8 Z M70 0 L85 0 L95 8 L80 8 Z M105 0 L120 0 L130 8 L115 8 Z"
            fill="white"
          />
        </g>
      </g>

      {/* Floor / Ground line */}
      <line
        x1="120"
        y1="418"
        x2="680"
        y2="418"
        stroke="#CBD5E1"
        strokeWidth="2"
        strokeDasharray="10 10"
        opacity="0.3"
      />
    </svg>
  </div>
);

export default MaintenanceIllustration;
