"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const menuItems = [
  { nombre: "Órdenes de Trabajo", icono: "🔧", href: "/ordenes", color: "bg-blue-50 border-blue-200" },
  { nombre: "Presupuestos", icono: "📋", href: "/presupuestos", color: "bg-green-50 border-green-200" },
  { nombre: "Clientes", icono: "👥", href: "/clientes", color: "bg-purple-50 border-purple-200" },
  { nombre: "Cobranzas", icono: "💰", href: "/cobranzas", color: "bg-amber-50 border-amber-200" },
  { nombre: "Gastos", icono: "📉", href: "/gastos", color: "bg-red-50 border-red-200" },
  { nombre: "Cajas", icono: "🏦", href: "/cajas", color: "bg-teal-50 border-teal-200" },
  { nombre: "Ventas", icono: "🛒", href: "/ventas", color: "bg-orange-50 border-orange-200" },
  { nombre: "Tareas", icono: "✅", href: "/tareas", color: "bg-indigo-50 border-indigo-200" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Servi<span className="text-red-600">NOA</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {session?.user?.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Menú</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {menuItems.map((item) => (
            <button
              key={item.nombre}
              onClick={() => router.push(item.href)}
              className={`${item.color} border rounded-xl p-6 text-center hover:shadow-md transition-all`}
            >
              <span className="text-3xl block mb-2">{item.icono}</span>
              <span className="text-sm font-medium text-gray-700">
                {item.nombre}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}