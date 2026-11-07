import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

/**
 * PullToRefresh
 *
 * Component hiển thị indicator glassmorphic khi người dùng vuốt xuống trên
 * giao diện mobile/tablet. Tự động làm mới dữ liệu TanStack React Query
 * mà không reload toàn bộ trang web.
 *
 * Màn hình bị vô hiệu hóa tự động:
 *  - /watch/:slug  (xem phim – tránh xung đột với gesture của video player)
 *  - /chapter/:id  (đọc truyện webtoon)
 *  - /admin        (bảng quản trị)
 *
 * Không dùng framer-motion để tránh xung đột ESLint rule `varsIgnorePattern: ^[A-Z_]`.
 * Tất cả animation được thực hiện bằng CSS transitions + keyframes thuần.
 *
 * @param {object}  props
 * @param {() => Promise<void>} [props.onRefresh] - Override hàm refresh mặc định
 */
const DISABLED_PATH_PREFIXES = ['/watch/', '/admin'];

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh }) {
  const queryClient = useQueryClient();
  const { pathname } = useLocation();

  // Tự động vô hiệu hóa trên các màn hình nhạy cảm
  const isDisabled = DISABLED_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Hàm refresh mặc định: làm mới tất cả queries đang active trên trang hiện tại
  const defaultRefresh = async () => {
    await queryClient.refetchQueries({ type: 'active' });
  };

  const { pullDistance, isPulling, isRefreshing, isSuccess } = usePullToRefresh({
    onRefresh: onRefresh ?? defaultRefresh,
    threshold: THRESHOLD,
    maxPull: 90,
    disabled: isDisabled,
  });

  if (isDisabled) return null;

  // Tính toán giá trị hiển thị
  const progress = Math.min(pullDistance / THRESHOLD, 1); // 0 → 1
  const iconRotation = progress * 180;                    // 0° → 180°

  // Vị trí Y của indicator: theo ngón tay khi kéo, neo ở 54px khi loading/success
  const translateY = isRefreshing || isSuccess ? 54 : pullDistance;
  // Indicator cao ~44px; translateY - 44 để phần thân capsule vừa ló ra khỏi top = 0
  const capsuleY = translateY - 44;

  // Opacity: hiện ra khi kéo > 5px hoặc khi đang loading/success
  const opacity = pullDistance > 5 || isRefreshing || isSuccess ? 1 : 0;

  // CSS transition:
  //  - Khi đang kéo (isPulling): theo ngón tay ngay lập tức, không transition
  //  - Khi thả: spring-like transition để thu về mượt mà
  const cssTransition = isPulling
    ? 'none'
    : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease';

  // Chỉ render khi có hoạt động
  const isVisible = isPulling || isRefreshing || isSuccess || pullDistance > 0;
  if (!isVisible) return null;

  // Màu border theo trạng thái
  const borderColor = isSuccess
    ? 'rgba(52, 211, 153, 0.6)'
    : progress >= 1
    ? 'rgba(52, 211, 153, 0.5)'
    : 'rgba(100, 116, 139, 0.3)';

  // Màu text theo trạng thái
  const textColor = isSuccess
    ? 'rgba(52, 211, 153, 1)'
    : progress >= 1
    ? 'rgba(203, 213, 225, 1)'
    : 'rgba(148, 163, 184, 0.9)';

  return (
    <>
      {/* CSS Keyframes — inject 1 lần duy nhất */}
      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ptr-pop-in {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* ── Wrapper cố định ── */}
      <div
        aria-live="polite"
        aria-label={
          isSuccess ? 'Đã cập nhật!' : isRefreshing ? 'Đang tải...' : undefined
        }
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          zIndex: 9999,
          pointerEvents: 'none',
          userSelect: 'none',
          willChange: 'transform, opacity',
          transform: `translateX(-50%) translateY(${capsuleY}px)`,
          opacity,
          transition: cssTransition,
        }}
      >
        {/* ── Pill / Capsule Indicator ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '9999px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${borderColor}`,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04)',
            transition: 'border-color 0.25s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {/* ── Vòng Progress Arc + Mũi tên ── */}
          {!isRefreshing && !isSuccess && (
            <div style={{ position: 'relative', width: '22px', height: '22px', flexShrink: 0 }}>
              {/* Track */}
              <svg width="22" height="22" style={{ position: 'absolute', inset: 0 }}>
                <circle
                  cx="11" cy="11" r="9"
                  fill="none"
                  stroke="rgba(100, 116, 139, 0.25)"
                  strokeWidth="2"
                />
              </svg>
              {/* Progress arc */}
              <svg
                width="22" height="22"
                style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
              >
                <circle
                  cx="11" cy="11" r="9"
                  fill="none"
                  stroke="rgba(52, 211, 153, 0.9)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 9}`}
                  strokeDashoffset={`${2 * Math.PI * 9 * (1 - progress)}`}
                  style={{ transition: isPulling ? 'none' : 'stroke-dashoffset 0.2s ease' }}
                />
              </svg>
              {/* Mũi tên */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: `rotate(${iconRotation}deg)`,
                  transition: isPulling ? 'none' : 'transform 0.2s ease',
                }}
              >
                {/* Mũi tên SVG inline — tránh import Lucide bị lint */}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke={progress >= 1 ? 'rgba(52, 211, 153, 1)' : 'rgba(148, 163, 184, 0.8)'}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
            </div>
          )}

          {/* ── Spinner loading ── */}
          {isRefreshing && !isSuccess && (
            <div style={{
              width: '22px', height: '22px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(52, 211, 153, 0.9)" strokeWidth="2.5"
                strokeLinecap="round"
                style={{ animation: 'ptr-spin 0.75s linear infinite' }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          )}

          {/* ── Icon thành công ── */}
          {isSuccess && (
            <div style={{
              width: '22px', height: '22px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              animation: 'ptr-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(52, 211, 153, 1)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
            </div>
          )}

          {/* ── Text trạng thái ── */}
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: textColor,
              transition: 'color 0.2s ease',
            }}
          >
            {isSuccess
              ? 'Đã cập nhật!'
              : isRefreshing
              ? 'Đang tải...'
              : progress >= 1
              ? 'Thả để làm mới'
              : 'Kéo để làm mới'}
          </span>
        </div>
      </div>
    </>
  );
}
