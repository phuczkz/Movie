import { useState, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { db } from '@/firebase.config.js';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { Plus, Trash2, Edit, CheckCircle2, XCircle } from "lucide-react";

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAnnouncements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return alert("Vui lòng nhập nội dung thông báo.");

    try {
      if (editingId) {
        await updateDoc(doc(db, "announcements", editingId), {
          title,
          content,
          active: isActive,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "announcements"), {
          title: title || "Thông báo hệ thống",
          content,
          active: isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("Đã xảy ra lỗi khi lưu thông báo.");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setContent(item.content);
    setIsActive(item.active);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xoá thông báo này?")) {
      try {
        await deleteDoc(doc(db, "announcements", id));
      } catch (error) {
        console.error("Error deleting announcement:", error);
      }
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateDoc(doc(db, "announcements", item.id), {
        active: !item.active,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setIsActive(true);
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike", "blockquote"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Quản lý Thông báo</h2>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors"
          >
            <Plus className="size-4" />
            Tạo thông báo mới
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-slate-900 rounded-xl border border-white/10 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Tiêu đề (tuỳ chọn - dùng để quản lý)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-white/10 px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                placeholder="Nhập tiêu đề..."
              />
            </div>
            
            <div className="quill-wrapper">
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Nội dung thông báo
              </label>
              <div className="bg-white rounded-lg overflow-hidden">
                <ReactQuill 
                  theme="snow" 
                  value={content} 
                  onChange={setContent} 
                  modules={modules}
                  className="h-64 mb-10 text-black"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-white/20 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="isActive" className="text-sm text-slate-300">
                Hiển thị ngay (Active)
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors"
              >
                {editingId ? "Cập nhật" : "Đăng thông báo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách thông báo */}
      <div className="bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="loader-orbit loader-orbit-sm" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Chưa có thông báo nào.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {announcements.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {item.title || "Thông báo hệ thống"}
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.createdAt?.toDate?.()?.toLocaleString("vi-VN") || "Mới tạo"}
                  </p>
                  <div 
                    className="text-sm text-slate-300 mt-2 line-clamp-2 prose prose-sm prose-invert"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(item)}
                    title={item.active ? "Tắt" : "Bật"}
                    className="p-2 text-slate-400 hover:text-amber-400 bg-slate-950 rounded-lg border border-white/5 hover:border-amber-400/30 transition-all"
                  >
                    {item.active ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    title="Sửa"
                    className="p-2 text-slate-400 hover:text-blue-400 bg-slate-950 rounded-lg border border-white/5 hover:border-blue-400/30 transition-all"
                  >
                    <Edit className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Xoá"
                    className="p-2 text-slate-400 hover:text-red-400 bg-slate-950 rounded-lg border border-white/5 hover:border-red-400/30 transition-all"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
