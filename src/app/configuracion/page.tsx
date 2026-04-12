"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@/components/auth/RoleGuard";
import {
  Settings, Trash2, Plus, Users, Shield, Wrench,
  ArrowLeft, Eye, EyeOff, Check, X, Edit2,
  AlertCircle, HardHat, Wallet
} from "lucide-react";
import { formatoService } from "@/services/formatoService";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  createdAt: string;
}

const ROL_LABELS: Record<string, string> = {
  ADMIN: "Administrador de Sistema",
  JEFE: "Jefe",
  ADMINISTRACION: "Administración",
  TECNICO: "Técnico",
};

const ROL_COLORS: Record<string, string> = {
  ADMIN: "border-red-600 text-red-600 bg-red-50/50",
  JEFE: "border-purple-600 text-purple-600 bg-purple-50/50",
  ADMINISTRACION: "border-blue-600 text-blue-600 bg-blue-50/50",
  TECNICO: "border-gray-900 text-gray-900 bg-gray-50",
};

type ActiveTab = "accesorios" | "usuarios" | "cajas";

export default function ConfiguracionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>("accesorios");

  // Accesorios
  const [accesorios, setAccesorios] = useState<{ id: string; nombre: string }[]>([]);
  const [nuevoAcc, setNuevoAcc] = useState("");
  const [loadingAcc, setLoadingAcc] = useState(false);

  // Cajas
  const [cajas, setCajas] = useState<{ id: string; nombre: string }[]>([]);
  const [nuevaCaja, setNuevaCaja] = useState("");
  const [loadingCajas, setLoadingCajas] = useState(false);

  // Usuarios list
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showInactivos, setShowInactivos] = useState(false);

  // Formulario nuevo/editar usuario
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uNombre, setUNombre] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRol, setURol] = useState("TECNICO");
  const [uActivo, setUActivo] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [guardandoUser, setGuardandoUser] = useState(false);
  const [errorUser, setErrorUser] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      cargarAccesorios();
      cargarUsuarios();
      if (["ADMIN", "JEFE"].includes((session?.user as any)?.rol)) {
        cargarCajas();
      }
    }
  }, [status]);

  const cargarAccesorios = async () => {
    setLoadingAcc(true);
    const res = await fetch("/api/accesorios");
    if (res.ok) setAccesorios(await res.json());
    setLoadingAcc(false);
  };

  const cargarUsuarios = async () => {
    setLoadingUsers(true);
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsuarios(await res.json());
    setLoadingUsers(false);
  };

  const cargarCajas = async () => {
    setLoadingCajas(true);
    const res = await fetch("/api/cajas");
    if (res.ok) setCajas(await res.json());
    setLoadingCajas(false);
  };

  // --- Accesorios ---
  const addAcc = async () => {
    if (!nuevoAcc.trim()) return;
    const res = await fetch("/api/accesorios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: formatoService.capitalizarPrimeraLetra(nuevoAcc.trim()) }),
    });
    if (res.ok) {
      const data = await res.json();
      setAccesorios((prev) => [...prev, data]);
      setNuevoAcc("");
    }
  };

  const removeAcc = async (id: string) => {
    await fetch(`/api/accesorios/${id}`, { method: "DELETE" });
    setAccesorios((prev) => prev.filter((x) => x.id !== id));
  };

  // --- Cajas ---
  const addCaja = async () => {
    if (!nuevaCaja.trim()) return;
    const res = await fetch("/api/cajas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: formatoService.capitalizarPrimeraLetra(nuevaCaja.trim()) }),
    });
    if (res.ok) {
      const data = await res.json();
      setCajas((prev) => [...prev, data]);
      setNuevaCaja("");
    } else {
      alert("Error al crear caja (¿quizás el nombre ya existe o no tenés permisos?).");
    }
  };

  // --- Usuarios ---
  const abrirNuevo = () => {
    setEditingUser(null);
    setUNombre(""); setUEmail(""); setUPassword(""); setURol("TECNICO"); setUActivo(true);
    setErrorUser("");
    setShowForm(true);
  };

  const abrirEditar = (u: Usuario) => {
    setEditingUser(u);
    setUNombre(u.nombre); setUEmail(u.email); setUPassword(""); setURol(u.rol); setUActivo(u.activo);
    setErrorUser("");
    setShowForm(true);
  };

  const guardarUsuario = async () => {
    if (!uNombre.trim() || !uEmail.trim()) { setErrorUser("Nombre y email solicitados"); return; }
    if (!editingUser && !uPassword.trim()) { setErrorUser("Contraseña requerida"); return; }
    setGuardandoUser(true);
    setErrorUser("");

    const body: Record<string, unknown> = { nombre: formatoService.capitalizarPalabras(uNombre), email: uEmail.toLowerCase(), rol: uRol, activo: uActivo };
    if (uPassword) body.password = uPassword;

    const url = editingUser ? `/api/usuarios/${editingUser.id}` : "/api/usuarios";
    const method = editingUser ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      cargarUsuarios();
    } else {
      const err = await res.json();
      setErrorUser(err.error || "Error al guardar usuario");
    }
    setGuardandoUser(false);
  };

  const toggleActivo = async (u: Usuario) => {
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !u.activo }),
    });
    if (res.ok) cargarUsuarios();
  };

  const usuariosFiltrados = usuarios.filter((u) => showInactivos || u.activo);

  if (status === "loading") return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando configuración...</div>
    </div>
  );

  return (
    <RoleGuard allowedRoles={["ADMIN", "JEFE"]}>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/dashboard" className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Mantenimiento</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración del Sistema</h1>
            </div>
          </div>
          <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 hidden sm:block">
            <Settings size={28} className="text-red-600" />
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-6 flex gap-8">
          {[
            { key: "accesorios" as ActiveTab, label: "Componentes", icon: <Wrench size={18} /> },
            (["ADMIN", "JEFE"].includes((session?.user as any)?.rol)) && { key: "cajas" as ActiveTab, label: "Entidades / Cajas", icon: <Wallet size={18} /> },
            { key: "usuarios" as ActiveTab, label: "Gestión de Personal", icon: <Users size={18} /> },
          ].filter(Boolean).map((tab: any) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-4 text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
                activeTab === tab.key
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full space-y-12">

        {activeTab === "accesorios" && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 border-b border-gray-100 bg-gray-50/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase">Catálogo de Accesorios</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Nomenclador para recepción de equipos</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={nuevoAcc}
                    onChange={(e) => setNuevoAcc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAcc()}
                    className="flex-1 sm:w-64 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-red-600 transition-all"
                    placeholder="Nuevo item..."
                  />
                  <button
                    onClick={addAcc}
                    className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-600/10 flex items-center gap-2"
                  >
                    <Plus size={18} /> Añadir
                  </button>
                </div>
            </div>

            <div className="p-8">
              {loadingAcc ? (
                <div className="p-10 text-center text-gray-400 text-xs font-bold animate-pulse">Cargando catálogo...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {accesorios.map((a) => (
                    <div
                      key={a.id}
                      className="group flex items-center justify-between bg-gray-50/50 border border-gray-100 px-4 py-3 rounded-xl hover:bg-white hover:border-red-100 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                         <span className="font-bold text-gray-900 uppercase text-xs truncate">{a.nombre}</span>
                      </div>
                      <button
                        onClick={() => removeAcc(a.id)}
                        className="text-gray-300 hover:text-red-600 transition-colors p-1"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {accesorios.length === 0 && (
                    <div className="col-span-full p-16 text-center border-2 border-dashed border-gray-100 rounded-2xl italic text-gray-400 text-sm">
                        No se registran componentes en el catálogo
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "cajas" && ["ADMIN", "JEFE"].includes((session?.user as any)?.rol) && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-12">
            <div className="p-8 border-b border-gray-100 bg-gray-50/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase">Gestión de Cajas</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Creación de entidades financieras o billeteras</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={nuevaCaja}
                    onChange={(e) => setNuevaCaja(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCaja()}
                    className="flex-1 sm:w-64 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-red-600 transition-all"
                    placeholder="Efectivo, Banco X..."
                  />
                  <button
                    onClick={addCaja}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2"
                  >
                    <Plus size={18} /> Añadir
                  </button>
                </div>
            </div>

            <div className="p-8">
              {loadingCajas ? (
                <div className="p-10 text-center text-gray-400 text-xs font-bold animate-pulse">Cargando cajas...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {cajas.map((c) => (
                    <div
                      key={c.id}
                      className="group flex items-center justify-between bg-gray-50/50 border border-gray-100 px-4 py-3 rounded-xl hover:bg-white hover:border-emerald-100 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                         <span className="font-bold text-gray-900 uppercase text-xs truncate">{c.nombre}</span>
                      </div>
                    </div>
                  ))}
                  {cajas.length === 0 && <p className="text-[10px] font-bold text-gray-400 uppercase">No hay cajas creadas.</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "usuarios" && (
          <div className="space-y-12">
            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900 uppercase">Gestión de Personal</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base de datos de usuarios y permisos</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 cursor-pointer uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                  <input
                    type="checkbox"
                    checked={showInactivos}
                    onChange={(e) => setShowInactivos(e.target.checked)}
                    className="w-4 h-4 rounded-md border-gray-200 text-red-600"
                  />
                  Mostrar inactivos
                </label>
                <button
                  onClick={abrirNuevo}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-red-600 transition-all shadow-lg shadow-gray-900/10 flex items-center gap-2"
                >
                  <Plus size={18} /> Nuevo Operador
                </button>
              </div>
            </div>

            {showForm && (
              <div className="bg-white border-2 border-red-600/10 rounded-3xl p-8 shadow-xl animate-in zoom-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                   <div className="bg-red-600/10 p-3 rounded-xl text-red-600">
                      <HardHat size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 uppercase">
                      {editingUser ? `Editar Usuario: ${editingUser.nombre}` : "Alta de Nuevo Usuario"}
                   </h3>
                </div>

                {errorUser && (
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-xs font-bold mb-8 flex items-center gap-2">
                    <AlertCircle size={16} /> {errorUser}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Nombre Completo *</label>
                    <input
                      type="text"
                      value={uNombre}
                      onChange={(e) => setUNombre(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Email Acceso *</label>
                    <input
                      type="email"
                      value={uEmail}
                      onChange={(e) => setUEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">
                      {editingUser ? "Nueva Clave (Opcional)" : "Password *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={uPassword}
                        onChange={(e) => setUPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-600"
                      >
                        {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Jerarquía / Rol</label>
                    <select
                      value={uRol}
                      onChange={(e) => setURol(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-xs font-bold outline-none uppercase appearance-none cursor-pointer"
                    >
                      {Object.entries(ROL_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {editingUser && (
                    <div className="space-y-2 text-center">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Estado de Cuenta</label>
                      <button
                        onClick={() => setUActivo(!uActivo)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-bold border-2 transition-all uppercase tracking-widest ${uActivo ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm" : "bg-red-50 border-red-100 text-red-700 shadow-sm"}`}
                      >
                        {uActivo ? "CUENTA ACTIVA" : "CUENTA INACTIVA / BLOQUEADA"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-10 pt-6 border-t border-gray-50">
                  <button
                    onClick={guardarUsuario}
                    disabled={guardandoUser}
                    className="flex-1 bg-red-600 text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    {guardandoUser ? "Guardando..." : editingUser ? "Actualizar Datos" : "Confirmar Alta"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3.5 bg-white border border-gray-200 text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {loadingUsers ? (
                <div className="p-16 text-center text-gray-400 text-xs font-bold animate-pulse italic">Cargando base de datos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-bold tracking-widest bg-gray-50/50">
                        <th className="text-left px-8 py-5">Nombre / Usuario</th>
                        <th className="text-left px-8 py-5">Email</th>
                        <th className="text-left px-8 py-5">Rol / Jerarquía</th>
                        <th className="text-left px-8 py-5">Estado</th>
                        <th className="text-right px-8 py-5">Sistema</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {usuariosFiltrados.map((u) => (
                        <tr key={u.id} className={`hover:bg-gray-50/30 group transition-all ${!u.activo ? "opacity-40 grayscale" : ""}`}>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {u.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                  <div className="font-bold text-gray-900 uppercase text-sm leading-tight flex items-center gap-2">
                                    {u.nombre}
                                    {u.id === (session?.user as { id?: string })?.id && (
                                       <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">USTED</span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">ID: {u.id.substring(0,8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-gray-500 font-medium text-xs">
                             {u.email}
                          </td>
                          <td className="px-8 py-6">
                             <span className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${ROL_COLORS[u.rol] || "border-gray-100 text-gray-400"}`}>
                               {ROL_LABELS[u.rol] || u.rol}
                             </span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${u.activo ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                                <span className="text-[10px] font-bold uppercase text-gray-600">{u.activo ? "Activo" : "Bloqueado"}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => abrirEditar(u)}
                                className="p-2 text-gray-300 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-all"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => toggleActivo(u)}
                                disabled={u.id === (session?.user as { id?: string })?.id}
                                className={`p-2 rounded-lg transition-all disabled:opacity-20 ${
                                  u.activo ? "text-gray-200 hover:text-red-700 hover:bg-red-50" : "text-gray-200 hover:text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                {u.activo ? <X size={18} /> : <Check size={18} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
    </RoleGuard>
  );
}
