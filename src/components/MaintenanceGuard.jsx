import { useEffect } from "react";
import { useAuth } from '@/features/auth/context/AuthContext';
import { useLocation } from "react-router-dom";
import MaintenanceNew from '@/components/MaintenanceNew.jsx';
import AppLoader from '@/components/app-loader.jsx';

export default function MaintenanceGuard({ children }) {
  const { user, userProfile, maintenance, loading, profileLoading, isAdmin } = useAuth();
  const location = useLocation();

  const isWhitelisted = userProfile?.isWhitelisted === true;
  const isBypassed = isAdmin || isWhitelisted;
  const isLoginPath = location.pathname === "/login";

  // Khi bảo trì đang bật:
  // - Admin và thành viên trong Whitelist được vào bình thường.
  // - Người đã đăng nhập nhưng KHÔNG phải Admin & KHÔNG thuộc Whitelist -> BỊ CHẶN 100% TRÊN MỌI TRANG (kể cả /login).
  // - Khách vãng lai (chưa đăng nhập): Chỉ được phép xem form /login để Admin/Whitelist có chỗ đăng nhập; bị chặn ở tất cả các trang khác.
  const isActive = Boolean(
    maintenance?.enabled &&
    !isBypassed &&
    !(isLoginPath && !user)
  );

  // Chặn phím tắt DevTools khi đang hiển thị màn hình bảo trì
  useEffect(() => {
    if (!isActive) return;

    const blockKeys = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    const blockCtxMenu = (e) => e.preventDefault();

    window.addEventListener("keydown", blockKeys, true);
    window.addEventListener("contextmenu", blockCtxMenu, true);
    return () => {
      window.removeEventListener("keydown", blockKeys, true);
      window.removeEventListener("contextmenu", blockCtxMenu, true);
    };
  }, [isActive]);

  // Điều kiện chờ tải ban đầu (Không mount giao diện con khi chưa xác định xong):
  // 1. Chờ Firestore xác nhận trạng thái bảo trì (!maintenance?.isLoaded).
  // 2. Nếu có bảo trì: chờ kiểm tra xong Auth & Profile để xác định quyền Admin/Whitelist.
  const isCheckingMaintenance = !maintenance?.isLoaded;
  const isCheckingUserAuth = Boolean(
    maintenance?.enabled &&
    (loading || (user && profileLoading && !isAdmin))
  );
  const showInitialLoading = isCheckingMaintenance || isCheckingUserAuth;

  // 1. Đang tải -> Chỉ render AppLoader, tuyệt đối không rò rỉ bất kỳ giao diện nào
  if (showInitialLoading) {
    return <AppLoader />;
  }

  // 2. Chế độ bảo trì kích hoạt -> Render duy nhất MaintenanceNew
  if (isActive) {
    return <MaintenanceNew />;
  }

  // 3. Đủ điều kiện -> Render ứng dụng
  return children;
}
