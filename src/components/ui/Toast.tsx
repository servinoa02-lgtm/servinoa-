"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = "success", onClose, duration = 4000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === "success";

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-xl shadow-xl text-sm font-bold transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${
        isSuccess
          ? "bg-emerald-900 text-emerald-100 border border-emerald-700"
          : "bg-gray-900 text-red-100 border border-red-600"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
      ) : (
        <AlertTriangle size={18} className="text-red-400 shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
