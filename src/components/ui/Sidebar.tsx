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
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "./LogoutButton";

const menuItems = [
  { name: "Dashboard", icon: <BarChart3 size={20} />, href: "/dashboard", activeFor: ["/dashboard"] },
  { name: "Taller (OT)", icon: <Wrench size={20} />, href: "/ordenes", activeFor: ["/ordenes"] },
  { name: "Presupuestos", icon: <FileText size={20} />, href: "/presupuestos", activeFor: ["/presupuestos"] },
  { name: "Finanzas", icon: <Wallet size={20} />, href: "/finanzas", activeFor: ["/finanzas", "/cobranzas", "/gastos", "/cajas", "/cheques"] },
  { name: "Clientes", icon: <Users size={20} />, href: "/clientes", activeFor: ["/clientes"] },
  { name: "Tareas", icon: <CheckSquare size={20} />, href: "/tareas", activeFor: ["/tareas"] },
  { name: "Configuración", icon: <Settings size={20} />, href: "/configuracion", activeFor: ["/configuracion"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === "/login") return null;

  return (
    <aside 
      className={`bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 flex flex-col z-40 ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Header / Logo */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
              Servi<span className="text-red-600">NOA</span>
            </h1>
          </Link>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xl">S</span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-600 hover:border-red-200 transition-all ${collapsed ? 'hidden' : 'flex'}`}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = item.activeFor
          ? item.activeFor.some((p) => pathname.startsWith(p))
          : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-red-50 text-red-600' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className={`${isActive ? 'text-red-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                {item.icon}
              </div>
              {!collapsed && (
                <span className="text-sm font-medium">
                   {item.name}
                </span>
              )}
              {collapsed && isActive && (
                <div className="absolute left-0 w-1 h-6 bg-red-600 rounded-r-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 mt-auto">
        <LogoutButton showLabel={!collapsed} />
        {!collapsed && (
          <p className="text-[10px] text-gray-400 text-center mt-4 font-medium uppercase tracking-wider">
            v3.0.0 Stable
          </p>
        )}
      </div>
    </aside>
  );
}
