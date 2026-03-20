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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Chọn ảnh đại diện</h3>
            <p className="text-slate-400 text-sm">Chọn từ thư viện anime hoặc tải lên ảnh của bạn</p>
          </div>
          <button
            onClick={() => !uploading && onClose()}
            className="p-2 rounded-xl text-slate-400 hover:bg-white/5 transition-colors"
            disabled={uploading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-8">
            <div className="max-h-[235px] overflow-y-auto no-scrollbar pb-6">
              <div className="grid grid-cols-5 gap-3">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => handleSelectPreset(avatar.url)}
                    disabled={uploading}
                    className={`relative group aspect-square rounded-2xl overflow-hidden border-2 transition-all ${currentAvatarUrl === avatar.url ? "border-emerald-500 scale-95" : "border-transparent hover:border-white/20"
                      }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.name}
                      className={`h-full w-full object-cover transition-transform group-hover:scale-110 ${uploading ? "opacity-30" : ""}`}
                    />
                    {currentAvatarUrl === avatar.url && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <Check className="text-white" size={24} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* Gradient overlay indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none z-10" />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest text-slate-500">
              <span className="bg-slate-900 px-4">Hoặc</span>
            </div>
          </div>

          <div className="mt-8">
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
              className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all group disabled:opacity-50"
            >
              <div className="p-4 rounded-full bg-slate-800 text-slate-400 group-hover:text-emerald-400 transition-colors">
                {uploading ? (
                  <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={24} />
                )}
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Tải ảnh lên từ máy tính</p>
                <p className="text-slate-400 text-xs mt-1">Hệ thống sẽ tự động nén ảnh cho bạn (Tối đa 5MB)</p>
              </div>
            </button>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
            <div className="bg-slate-800 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4">
              <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-white">Đang xử lý ảnh...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
