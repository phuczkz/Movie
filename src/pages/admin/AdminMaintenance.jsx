import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useAuth } from "../../context/AuthContext";
import { Construction, ToggleLeft, ToggleRight } from "lucide-react";

export default function AdminMaintenance() {
  const [settings, setSettings] = useState({
    enabled: false,
    title: "",
    message: "",
    statusText: "",
  });
  const [localTitle, setLocalTitle] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  const [localStatusText, setLocalStatusText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { maintenance } = useAuth();

  useEffect(() => {
    if (maintenance) {
      setSettings(maintenance);
      setLocalTitle(maintenance.title || "");
      setLocalMessage(maintenance.message || "");
      setLocalStatusText(maintenance.statusText || "");
    }
  }, [maintenance]);

  const toggle = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "maintenance"), {
        ...settings,
        enabled: !settings.enabled,
        title: localTitle,
        message: localMessage,
        statusText: localStatusText,
      });
    } finally {
      setSaving(false);
    }
  };

  const saveContent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "maintenance"), {
        ...settings,
        title: localTitle,
        message: localMessage,
        statusText: localStatusText,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Chế độ bảo trì</h2>
        <p className="text-slate-400 text-sm mt-1">
          Khi bật, toàn bộ người dùng sẽ thấy thông báo bảo trì và không thể
          truy cập website
        </p>
      </div>

      {/* Status toggle */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              settings.enabled ? "bg-amber-500/20" : "bg-white/5"
            }`}
          >
            <Construction
              className={`h-6 w-6 ${
                settings.enabled ? "text-amber-400" : "text-slate-500"
              }`}
            />
          </div>
          <div>
            <p className="font-semibold text-white">Trạng thái hiện tại</p>
            <p
              className={`text-sm font-medium ${
                settings.enabled ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {settings.enabled
                ? "🔴 Đang bảo trì"
                : "🟢 Hoạt động bình thường"}
            </p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm transition-all ${
            settings.enabled
              ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              : "bg-amber-500 text-slate-950 hover:bg-amber-400"
          } disabled:opacity-60`}
        >
          {settings.enabled ? (
            <>
              <ToggleRight className="h-5 w-5" /> Tắt bảo trì
            </>
          ) : (
            <>
              <ToggleLeft className="h-5 w-5" /> Bật bảo trì
            </>
          )}
        </button>
      </div>

      {/* Content editor */}
      <form onSubmit={saveContent} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">
            Tiêu đề thông báo
          </label>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="BẢO TRÌ HỆ THỐNG"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">
            Nội dung thông báo
          </label>
          <textarea
            rows={4}
            value={localMessage}
            onChange={(e) => setLocalMessage(e.target.value)}
            placeholder="Admin đang nghèo, ủng hộ Admin để duy trì website"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none resize-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">
            Trạng thái (Badge)
          </label>
          <input
            type="text"
            value={localStatusText}
            onChange={(e) => setLocalStatusText(e.target.value)}
            placeholder="ĐANG NÂNG CẤP HỆ THỐNG"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-white/5 border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-60"
        >
          {saved ? "✓ Đã lưu" : saving ? "Đang lưu..." : "Lưu nội dung"}
        </button>
      </form>

      {/* Preview */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4 space-y-3">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
          Xem trước (Trang bảo trì)
        </p>
        <div className="rounded-2xl bg-white p-8 text-center space-y-6 shadow-2xl">
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#1e4e8c] uppercase tracking-tight">
              {localTitle || "BẢO TRÌ HỆ THỐNG"}
            </h1>
            <p className="text-slate-500 text-sm font-medium leading-relaxed whitespace-pre-wrap">
              {localMessage ||
                "Admin đang nghèo, ủng hộ Admin để duy trì website"}
            </p>
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                {localStatusText || "ĐANG NÂNG CẤP HỆ THỐNG"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
