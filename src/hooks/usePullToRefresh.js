import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * usePullToRefresh
 *
 * Hook xử lý toàn bộ logic kéo xuống để làm mới (Pull-to-Refresh) trên
 * giao diện mobile/tablet mà không cần reload toàn bộ trang web.
 *
 * Tính năng:
 * - Lực cản đàn hồi (damping): kéo càng xa càng nặng, không vượt quá maxPull
 * - Phát hiện vuốt dọc vs ngang để tránh xung đột với Carousel/Slider
 * - Haptic Feedback rung nhẹ khi đạt ngưỡng
 * - Tự động gọi onRefresh() khi thả tay đủ cự ly
 *
 * @param {object} options
 * @param {() => Promise<void>} options.onRefresh  - Hàm async xử lý refresh dữ liệu
 * @param {number}  options.threshold              - Cự ly kéo tối thiểu để kích hoạt refresh (px), mặc định 70
 * @param {number}  options.maxPull                - Cự ly kéo tối đa hiển thị trên giao diện (px), mặc định 90
 * @param {boolean} options.disabled               - Tắt toàn bộ tính năng (vd: trang xem phim)
 * @returns {{ pullDistance: number, isPulling: boolean, isRefreshing: boolean, isSuccess: boolean }}
 */
const safeVibrate = (pattern = 10) => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return false;
    }
    // Ngăn lỗi [Intervention]: Chrome yêu cầu user activation (đã tap/click vào frame ít nhất 1 lần)
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
      return false;
    }
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
};

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 90,
  disabled = false,
} = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling]       = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess]       = useState(false);

  // Internal refs — không trigger re-render
  const startYRef          = useRef(0);
  const startXRef          = useRef(0);
  const directionLockedRef = useRef(null); // 'vertical' | 'horizontal' | null
  const hasVibratedRef     = useRef(false);
  const didVibrateRef      = useRef(false);
  const isRefreshingRef    = useRef(false);

  // Công thức giảm tốc đàn hồi: cảm giác "kéo mạng nhện"
  const applyDamping = useCallback(
    (rawDelta) => Math.min(Math.pow(rawDelta, 0.78) * 0.9, maxPull),
    [maxPull]
  );

  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setIsPulling(false);

    const startTime = performance.now();
    try {
      await onRefresh?.();
    } finally {
      // Giữ spinner hiển thị tối thiểu 600ms để mắt cảm nhận được hành động
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      setIsSuccess(true);
      // Hiện biểu tượng thành công 600ms rồi thu về
      await new Promise((r) => setTimeout(r, 600));

      setIsRefreshing(false);
      setIsSuccess(false);
      setPullDistance(0);
      isRefreshingRef.current = false;
    }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e) => {
      if (isRefreshingRef.current) return;
      // Chỉ kích hoạt khi đang ở đỉnh trang (scrollY = 0)
      if (window.scrollY > 0) return;

      startYRef.current          = e.touches[0].clientY;
      startXRef.current          = e.touches[0].clientX;
      directionLockedRef.current = null;
      hasVibratedRef.current     = false;
      didVibrateRef.current      = false;
    };

    const onTouchMove = (e) => {
      if (isRefreshingRef.current) return;
      if (window.scrollY > 0) return;

      const deltaY = e.touches[0].clientY - startYRef.current;
      const deltaX = e.touches[0].clientX - startXRef.current;

      // Chỉ lock hướng sau khi di chuyển đủ xa để tránh lỗi click nhẹ
      if (!directionLockedRef.current && (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5)) {
        // Vuốt dọc phải rõ ràng hơn vuốt ngang: góc > ~56°
        directionLockedRef.current =
          Math.abs(deltaY) > Math.abs(deltaX) * 1.5 ? 'vertical' : 'horizontal';
      }

      // Chỉ xử lý vuốt dọc xuống
      if (directionLockedRef.current !== 'vertical' || deltaY <= 0) return;

      const damped = applyDamping(deltaY);
      setPullDistance(damped);
      setIsPulling(true);

      // Haptic feedback khi đạt ngưỡng lần đầu tiên
      if (damped >= threshold && !hasVibratedRef.current) {
        hasVibratedRef.current = true;
        const vibrated = safeVibrate(10);
        if (vibrated) {
          didVibrateRef.current = true;
        }
      }

      // Ngăn trình duyệt cuộn trang khi đang kéo
      if (damped > 2) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (isRefreshingRef.current) return;
      if (!isPulling && pullDistance <= 0) return;

      if (pullDistance >= threshold) {
        // Nếu ở touchmove chưa rung được do chưa có user activation, thử lại ở touchend
        if (!didVibrateRef.current) {
          safeVibrate(10);
        }
        triggerRefresh();
      } else {
        // Kéo chưa đủ — thu về
        setPullDistance(0);
        setIsPulling(false);
      }
      hasVibratedRef.current     = false;
      didVibrateRef.current      = false;
      directionLockedRef.current = null;
    };

    // passive: false cần thiết để có thể gọi e.preventDefault() trong touchmove
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [disabled, threshold, applyDamping, triggerRefresh, isPulling, pullDistance]);

  return { pullDistance, isPulling, isRefreshing, isSuccess };
}
