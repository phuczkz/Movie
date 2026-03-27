import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { Trash2, UserCircle, RefreshCw, ShieldCheck, UserPlus, Power, X, AlertCircle, History } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";
import WatchHistory from "../../components/WatchHistory";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null, loading: false });
  const [historyModal, setHistoryModal] = useState({ isOpen: false, userId: null, userName: "" });

  const { maintenance, toggleMaintenanceMode, toggleUserWhitelist, createAccountByAdmin, deleteUserByAdmin } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", displayName: "" });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;
    setCreating(true);
    try {
      await createAccountByAdmin(formData.email, formData.password, formData.displayName);
      setFormData({ email: "", password: "", displayName: "" });
      setShowCreateForm(false);
      fetchUsers();
    } catch (err) {
      alert("Lỗi tạo user: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleWhitelist = async (uid, currentStatus) => {
    try {
      await toggleUserWhitelist(uid, !currentStatus);
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, isWhitelisted: !currentStatus } : u));
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = (uid) => {
    setConfirmModal({
      isOpen: true,
      userId: uid,
      loading: false
    });
  };

  const confirmDelete = async () => {
    const uid = confirmModal.userId;
    if (!uid) return;

    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      await deleteUserByAdmin(uid);
      setUsers((prev) => prev.filter((u) => u.id !== uid));
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    } finally {
      setConfirmModal({ isOpen: false, userId: null, loading: false });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Người dùng</h2>
          <p className="text-slate-400 text-sm mt-1">{users.length} tài khoản đã đăng ký</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleMaintenanceMode(!maintenance.enabled)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              maintenance.enabled 
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
            }`}
          >
            <Power className="h-4 w-4" />
            Bảo trì: {maintenance.enabled ? "ĐANG BẬT" : "Tắt"}
          </button>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            Tạo User
          </button>

          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Tạo tài khoản mới</h3>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="p-2 rounded-xl hover:bg-white/5 text-slate-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400 ml-1">Tên hiển thị</label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  value={formData.displayName}
                  onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400 ml-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-400 ml-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                {creating ? "Đang tạo..." : "Xác nhận tạo"}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-semibold">Người dùng</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-semibold hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-semibold hidden lg:table-cell text-center">Whitelist</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest text-slate-500 font-semibold hidden lg:table-cell">Ngày tạo</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserCircle className="h-full w-full text-slate-500" />
                        )}
                      </div>
                      <span className="font-medium text-slate-200 truncate max-w-[140px]">{u.displayName || "Ẩn danh"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden md:table-cell truncate max-w-[200px]">{u.email}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleToggleWhitelist(u.id, u.isWhitelisted)}
                        className={`p-2 rounded-xl transition-all ${
                          u.isWhitelisted 
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 shadow-inner" 
                            : "bg-white/5 text-slate-600 hover:bg-white/10"
                        }`}
                        title={u.isWhitelisted ? "Bỏ Whitelist" : "Thêm vào Whitelist"}
                      >
                        <ShieldCheck className={`h-5 w-5 ${u.isWhitelisted ? "animate-pulse" : "opacity-30"}`} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {u.createdAt?.toDate?.()?.toLocaleDateString("vi-VN") ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.email === import.meta.env.VITE_ADMIN_EMAIL ? (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-amber-400 font-semibold px-2 py-1 rounded-lg bg-amber-500/10">Admin</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setHistoryModal({ isOpen: true, userId: u.id, userName: u.displayName || u.email })}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Xem lịch sử xem phim"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Xóa user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">Chưa có người dùng nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Xác nhận xóa người dùng?"
        message="Hành động này sẽ xóa vĩnh viễn tài khoản người dùng và không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?"
        confirmText="Xóa tài khoản"
        cancelText="Hủy"
        loading={confirmModal.loading}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, userId: null, loading: false })}
        type="danger"
      />

      {/* History Modal */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-500" />
                  Lịch sử xem: {historyModal.userName}
                </h3>
                <p className="text-slate-400 text-xs mt-1">Lịch sử được sắp xếp theo thời gian mới nhất</p>
              </div>
              <button 
                onClick={() => setHistoryModal({ isOpen: false, userId: null, userName: "" })}
                className="p-2 rounded-xl hover:bg-white/5 text-slate-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-hidden">
              <WatchHistory userId={historyModal.userId} adminView={true} />
            </div>

            <div className="p-4 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setHistoryModal({ isOpen: false, userId: null, userName: "" })}
                className="px-6 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 font-semibold transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
