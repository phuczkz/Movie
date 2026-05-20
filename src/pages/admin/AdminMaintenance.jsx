import { useEffect, useReducer } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useAuth } from "../../context/AuthContext";
import { Construction, ToggleLeft, ToggleRight } from "lucide-react";

const initialState = {
  settings: {
    enabled: false,
    title: "",
    message: "",
    statusText: "",
  },
  localTitle: "",
  localMessage: "",
  localStatusText: "",
  saving: false,
  saved: false,
};

function maintenanceReducer(state, action) {
  switch (action.type) {
    case "SET_MAINTENANCE":
      return {
        ...state,
        settings: action.payload,
        localTitle: action.payload.title || "",
        localMessage: action.payload.message || "",
        localStatusText: action.payload.statusText || "",
      };
    case "SET_FIELD":
      return {
        ...state,
        [action.field]: action.value,
      };
    case "SET_SAVING":
      return {
        ...state,
        saving: action.payload,
      };
    case "SET_SAVED":
      return {
        ...state,
        saved: action.payload,
      };
    default:
      return state;
  }
}

export default function AdminMaintenance() {
  const [state, dispatch] = useReducer(maintenanceReducer, initialState);
  const {
    settings,
    localTitle,
    localMessage,
    localStatusText,
    saving,
    saved,
  } = state;

  const { maintenance } = useAuth();

  useEffect(() => {
    if (maintenance) {
      dispatch({ type: "SET_MAINTENANCE", payload: maintenance });
    }
  }, [maintenance]);

  const toggle = async () => {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      await setDoc(doc(db, "settings", "maintenance"), {
        ...settings,
        enabled: !settings.enabled,
        title: localTitle,
        message: localMessage,
        statusText: localStatusText,
      });
    } finally {
      dispatch({ type: "SET_SAVING", payload: false });
    }
  };

  const saveContent = async (e) => {
    e.preventDefault();
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      await setDoc(doc(db, "settings", "maintenance"), {
        ...settings,
        title: localTitle,
        message: localMessage,
        statusText: localStatusText,
      });
      dispatch({ type: "SET_SAVED", payload: true });
      setTimeout(() => dispatch({ type: "SET_SAVED", payload: false }), 2000);
    } finally {
      dispatch({ type: "SET_SAVING", payload: false });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold text-white">Chế độ bảo trì</h2>
        <p className="text-slate-400 text-sm mt-1">
          Khi bật, toàn bộ người dùng sẽ thấy thông báo bảo trì và không thể
          truy cập website
        </p>
      </div>

      {/* Status toggle */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`size-12 rounded-xl flex items-center justify-center ${
              settings.enabled ? "bg-amber-500/20" : "bg-white/5"
            }`}
          >
            <Construction
              className={`size-6 ${
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
              ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              : "bg-amber-500 text-amber-950 hover:bg-amber-400"
          } disabled:opacity-60`}
        >
          {settings.enabled ? (
            <>
              <ToggleRight className="size-5" /> Tắt bảo trì
            </>
          ) : (
            <>
              <ToggleLeft className="size-5" /> Bật bảo trì
            </>
          )}
        </button>
      </div>

      {/* Content editor */}
      <form onSubmit={saveContent} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="m-title" className="text-sm font-semibold text-slate-300">
            Tiêu đề thông báo
          </label>
          <input
            id="m-title"
            type="text"
            value={localTitle}
            onChange={(e) =>
              dispatch({ type: "SET_FIELD", field: "localTitle", value: e.target.value })
            }
            placeholder="BẢO TRÌ HỆ THỐNG"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="m-message" className="text-sm font-semibold text-slate-300">
            Nội dung thông báo
          </label>
          <textarea
            id="m-message"
            rows={4}
            value={localMessage}
            onChange={(e) =>
              dispatch({ type: "SET_FIELD", field: "localMessage", value: e.target.value })
            }
            placeholder="Admin đang nghèo, ủng hộ Admin để duy trì website"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none resize-none"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="m-status" className="text-sm font-semibold text-slate-300">
            Trạng thái (Badge)
          </label>
          <input
            id="m-status"
            type="text"
            value={localStatusText}
            onChange={(e) =>
              dispatch({ type: "SET_FIELD", field: "localStatusText", value: e.target.value })
            }
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
            <h1 className="text-2xl font-semibold text-[#1e4e8c] uppercase tracking-tight">
              {localTitle || "BẢO TRÌ HỆ THỐNG"}
            </h1>
            <p className="text-slate-500 text-sm font-medium leading-relaxed whitespace-pre-wrap">
              {localMessage ||
                "Admin đang nghèo, ủng hộ Admin để duy trì website"}
            </p>
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100">
              <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
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
