"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton({ showLabel = true }: { showLabel?: boolean }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={`w-full flex items-center ${showLabel ? 'gap-3 px-3' : 'justify-center'} py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all group`}
      title="Cerrar sesión"
    >
      <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
      {showLabel && <span className="text-sm font-semibold">Cerrar sesión</span>}
    </button>
  );
}
