import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { Trash2, UserCircle, RefreshCw } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

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

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (uid) => {
    setDeletingId(uid);
    try {
      await deleteDoc(doc(db, "users", uid));
      setUsers((prev) => prev.filter((u) => u.id !== uid));
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Người dùng</h2>
          <p className="text-slate-400 text-sm mt-1">{users.length} tài khoản đã đăng ký</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

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
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                    {u.createdAt?.toDate?.()?.toLocaleDateString("vi-VN") ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {u.email === import.meta.env.VITE_ADMIN_EMAIL ? (
                      <span className="text-xs text-amber-400 font-semibold px-2 py-1 rounded-lg bg-amber-500/10">Admin</span>
                    ) : confirmId === u.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id}
                          className="text-xs px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                        >
                          {deletingId === u.id ? "..." : "Xóa"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs px-2 py-1 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(u.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Xóa user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
    </div>
  );
}
