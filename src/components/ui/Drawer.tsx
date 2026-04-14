"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = "max-w-md", // Opciones comunes: max-w-sm, max-w-md, max-w-lg, max-w-xl
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-[2px]">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div
        ref={drawerRef}
        className={`absolute inset-y-0 right-0 w-full ${width} bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/20">
          {children}
        </div>
      </div>
    </div>
  );
}
