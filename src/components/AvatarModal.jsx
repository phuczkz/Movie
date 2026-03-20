import { useState, useRef } from "react";
import { X, Upload, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const PRESET_AVATARS = [
  { id: "sjv", name: "Sung Jin-woo", url: "/avatars/sung_jin_woo.png" },
  { id: "cha", name: "Cha Hae-In", url: "/avatars/cha_hae_in.png" },
  { id: "beru", name: "Beru", url: "/avatars/beru.png" },
  { id: "igris", name: "Igris", url: "/avatars/igris.png" },

  { id: "luffy", name: "Luffy", url: "/avatars/luffy.png" },
  { id: "zoro", name: "Zoro", url: "/avatars/zoro.png" },
  { id: "sanji", name: "Sanji", url: "/avatars/sanji.png" },
  { id: "isagi", name: "Isagi", url: "/avatars/isagi.png" },
  { id: "nagi", name: "Nagi", url: "/avatars/nagi.png" },
  { id: "bachira", name: "Bachira", url: "/avatars/bachira.png" },
  { id: "rin", name: "Rin Itoshi", url: "/avatars/rin.png" },
  { id: "barou", name: "Barou", url: "/avatars/barou.png" },
  { id: "chigiri", name: "Chigiri", url: "/avatars/chigiri.png" },
  { id: "gojo", name: "Gojo", url: "/avatars/gojo.png" },
  { id: "sukuna", name: "Sukuna", url: "/avatars/sukuna.png" },
  { id: "megumi", name: "Megumi", url: "/avatars/megumi.png" },
  { id: "itadori", name: "Itadori", url: "/avatars/itadori.png" },

  { id: "c-luffy", name: "Chibi Luffy", url: "/avatars/chibi_luffy.png" },
  { id: "c-zoro", name: "Chibi Zoro", url: "/avatars/chibi_zoro.png" },
  { id: "c-isagi", name: "Chibi Isagi", url: "/avatars/chibi_isagi.png" },
];

export default function AvatarModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSuccess,
  onError
}) {
  const { updateProfileData, uploadAvatar } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSelectPreset = async (url) => {
    setUploading(true);
    try {
      await updateProfileData({ photoURL: url });
      if (onSuccess) onSuccess("Đã cập nhật ảnh đại diện");
      onClose();
    } catch (err) {
      if (onError) onError("Không thể cập nhật ảnh đại diện: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // Allow up to 5MB for selection, will be resized
      if (onError) onError("Ảnh gốc quá lớn (tối đa 5MB). Hệ thống sẽ tự nén ảnh cho bạn.");
      return;
    }

    setUploading(true);
    try {
      console.log("Starting client-side resize and Firestore upload...");
      await uploadAvatar(file);
      if (onSuccess) onSuccess("Đã cập nhật ảnh đại diện");
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      if (onError) onError("Lỗi khi xử lý ảnh: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-slate-900 border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-500 sm:duration-300 max-h-[90vh] flex flex-col">
        <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Chọn ảnh đại diện</h3>
            <p className="text-slate-400 text-sm sm:text-base mt-1">Chọn từ thư viện anime hoặc tải lên ảnh của bạn</p>
          </div>
          <button
            onClick={() => !uploading && onClose()}
            className="p-2.5 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-all active:scale-90"
            disabled={uploading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
          <div className="relative mb-10">
            <div className="max-h-[280px] sm:max-h-[340px] md:max-h-[400px] overflow-y-auto no-scrollbar pb-4 pr-1">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => handleSelectPreset(avatar.url)}
                    disabled={uploading}
                    className={`relative group aspect-square rounded-2xl sm:rounded-3xl overflow-hidden border-4 transition-all ${currentAvatarUrl === avatar.url 
                      ? "border-emerald-500 scale-95 shadow-lg shadow-emerald-500/20" 
                      : "border-transparent hover:border-white/20 hover:scale-105"
                      }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${uploading ? "opacity-30" : ""}`}
                    />
                    {currentAvatarUrl === avatar.url ? (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <div className="bg-emerald-500 rounded-full p-1.5 shadow-lg">
                          <Check className="text-slate-950" size={20} />
                        </div>
                      </div>
                    ) : (
                       <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* Gradient overlay indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent pointer-events-none z-10" />
          </div>

          <div className="relative mb-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] sm:text-xs uppercase tracking-[0.3em] font-black text-slate-500">
              <span className="bg-slate-900 px-6">Hoặc tải lên</span>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-4 p-8 sm:p-10 rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/50 transition-all group disabled:opacity-50"
            >
              <div className="p-5 rounded-3xl bg-slate-800 text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:scale-110 transition-all duration-300 shadow-xl">
                {uploading ? (
                  <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={32} />
                )}
              </div>
              <div className="text-center">
                <p className="text-white text-lg font-bold">Thêm ảnh từ thiết bị</p>
                <p className="text-slate-400 text-sm mt-1 max-w-[240px]">Hệ thống sẽ tự động tối ưu dung lượng ảnh cho bạn (Tối đa 5MB)</p>
              </div>
            </button>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6 text-center">
             <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs animate-in zoom-in-95 duration-300">
                <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h4 className="text-white font-bold text-lg">Đang xử lý ảnh</h4>
                  <p className="text-slate-400 text-sm mt-1">Vui lòng chờ trong giây lát...</p>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
