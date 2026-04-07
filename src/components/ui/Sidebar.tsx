"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Wrench, 
  FileText, 
  Wallet, 
  Users, 
  Settings, 
  CheckSquare, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "./LogoutButton";

const menuItems = [
  { name: "Dashboard", icon: <BarChart3 size={20} />, href: "/dashboard" },
  { name: "Taller (OT)", icon: <Wrench size={20} />, href: "/ordenes" },
  { name: "Presupuestos", icon: <FileText size={20} />, href: "/presupuestos" },
  { name: "Cobranzas", icon: <Wallet size={20} />, href: "/cobranzas" },
  { name: "Clientes", icon: <Users size={20} />, href: "/clientes" },
  { name: "Tareas", icon: <CheckSquare size={20} />, href: "/tareas" },
  { name: "Configuración", icon: <Settings size={20} />, href: "/configuracion" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Don't show sidebar on login page
  if (pathname === "/login") return null;

  return (
    <aside 
      className={`bg-surface border-r border-border-custom h-screen sticky top-0 transition-all duration-300 flex flex-col z-40 ${collapsed ? 'w-20' : 'w-64'}`}
    >
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-xl font-black tracking-tighter text-white">
            Servi<span className="text-brand-primary">NOA</span>
          </h1>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
            <span className="text-brand-primary font-black text-xs">S</span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg border border-border-custom hover:bg-white/5 text-slate-400 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-brand-primary/10 text-brand-primary font-bold shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`${isActive ? 'text-brand-primary' : 'text-slate-500 group-hover:text-white'} transition-colors`}>
                {item.icon}
              </div>
              {!collapsed && <span className="text-sm">{item.name}</span>}
              {!collapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-custom">
        <LogoutButton showLabel={!collapsed} />
      </div>
    </aside>
  );
}
