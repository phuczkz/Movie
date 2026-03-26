import React from 'react';
import { Trash2, AlertCircle, X } from 'lucide-react';

/**
 * A reusable premium-styled confirmation modal.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal description message
 * @param {string} props.confirmText - Text for the confirm button
 * @param {string} props.cancelText - Text for the cancel button
 * @param {function} props.onConfirm - Callback when confirmed
 * @param {function} props.onCancel - Callback when canceled
 * @param {string} props.type - 'danger' | 'warning' | 'info' (defaults to 'danger')
 * @param {boolean} props.loading - Whether the confirm action is in progress
 */
export default function ConfirmModal({
  isOpen,
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  onConfirm,
  onCancel,
  type = "danger",
  loading = false
}) {
  if (!isOpen) return null;

  const colorClasses = {
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20",
    warning: "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20",
    info: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20"
  };

  const iconClasses = {
    danger: "bg-rose-500/10 text-rose-500",
    warning: "bg-amber-500/10 text-amber-500",
    info: "bg-emerald-500/10 text-emerald-500"
  };

  const Icon = type === "danger" ? Trash2 : AlertCircle;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[32px] p-6 shadow-2xl scale-in-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-2">
          <div className={`p-3 rounded-2xl ${iconClasses[type]}`}>
            <Icon size={24} />
          </div>
          <button 
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-8">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            disabled={loading}
            onClick={onCancel}
            className="flex-1 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button 
            disabled={loading}
            onClick={onConfirm}
            className={`flex-1 px-4 py-3.5 rounded-2xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${colorClasses[type]}`}
          >
            {loading && (
              <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
