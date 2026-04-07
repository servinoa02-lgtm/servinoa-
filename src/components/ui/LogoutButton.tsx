"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton({ showLabel = true }: { showLabel?: boolean }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={`w-full flex items-center ${showLabel ? 'gap-4 px-5' : 'justify-center'} py-4 rounded-xl text-gray-500 hover:text-red-700 hover:bg-red-50 transition-all group border border-transparent hover:border-red-100 shadow-sm hover:shadow-md`}
      title="Cerrar sesión"
    >
      <LogOut size={20} className="group-hover:rotate-6 transition-transform text-gray-400 group-hover:text-red-600" />
      {showLabel && <span className="text-xs font-black uppercase tracking-widest">Cerrar Sesión</span>}
    </button>
  );
}
