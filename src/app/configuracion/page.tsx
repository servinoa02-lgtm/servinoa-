"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Settings, Trash2, Plus, Users, Shield, Wrench,
  ArrowLeft, Eye, EyeOff, Check, X, Edit2, RefreshCw,
  AlertCircle, ChevronRight, HardHat, FileCode, Lock
} from "lucide-react";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  createdAt: string;
}

const ROL_LABELS: Record<string, string> = {
  ADMIN: "ADMINISTRADOR DE SISTEMA",
  TECNICO: "OPERADOR TÉCNICO",
  CAJA: "CONTROL DE TESORERÍA",
  VENTAS: "GESTIÓN COMERCIAL",
};

const ROL_COLORS: Record<string, string> = {
  ADMIN: "border-red-600 text-red-600 bg-red-50/50",
  TECNICO: "border-gray-900 text-gray-900 bg-gray-50",
  CAJA: "border-emerald-600 text-emerald-600 bg-emerald-50/50",
  VENTAS: "border-amber-600 text-amber-600 bg-amber-50/50",
};

type ActiveTab = "accesorios" | "usuarios";

export default function ConfiguracionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("accesorios");

  // Accesorios
  const [accesorios, setAccesorios] = useState<{ id: string; nombre: string }[]>([]);
  const [nuevoAcc, setNuevoAcc] = useState("");
  const [loadingAcc, setLoadingAcc] = useState(false);

  // Usuarios
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

  // --- Accesorios ---
  const addAcc = async () => {
    if (!nuevoAcc.trim()) return;
    const res = await fetch("/api/accesorios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoAcc.trim().toUpperCase() }),
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
    if (!uNombre.trim() || !uEmail.trim()) { setErrorUser("NOMBRE Y EMAIL SON REQUERIDOS"); return; }
    if (!editingUser && !uPassword.trim()) { setErrorUser("LA CONTRASEÑA ES REQUERIDA PARA NUEVOS USUARIOS"); return; }
    setGuardandoUser(true);
    setErrorUser("");

    const body: Record<string, unknown> = { nombre: uNombre.toUpperCase(), email: uEmail.toLowerCase(), rol: uRol, activo: uActivo };
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
      setErrorUser(err.error || "ERROR CRÍTICO AL GUARDAR");
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-20">
      <div className="w-20 h-2 bg-red-600 rounded-full animate-pulse mb-8" />
      <p className="text-gray-400 font-black animate-pulse uppercase tracking-[0.4em] italic text-center">
        ESTABLECIENDO CONEXIÓN CON EL NÚCLEO DE CONFIGURACIÓN...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans animate-in fade-in duration-700">
      {/* INDUSTRIAL HEADER */}
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-28 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="p-4 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-2xl transition-all border-2 border-transparent hover:border-gray-200 active:scale-90">
              <ArrowLeft size={28} />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-70">Console Management</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">Configuración</h1>
            </div>
          </div>
          <div className="bg-gray-900 p-4 rounded-2xl border-2 border-gray-800 shadow-2xl hidden md:block">
            <Settings size={36} className="text-red-600 animate-[spin_4s_linear_infinite]" />
          </div>
        </div>
      </header>

      {/* INDUSTRIAL TABS */}
      <div className="bg-white border-b-2 border-gray-200 sticky top-28 z-30 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-10 flex gap-10 pt-6">
          {[
            { key: "accesorios" as ActiveTab, label: "CATÁLOGO DE COMPONENTES", icon: <Wrench size={20} /> },
            { key: "usuarios" as ActiveTab, label: "JERARQUÍA DE PERSONAL", icon: <Users size={20} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-4 px-10 py-6 text-[11px] font-black rounded-t-[32px] border-b-4 transition-all uppercase tracking-[0.25em] italic whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-red-600 text-red-600 bg-red-50/20 shadow-[0_-10px_40px_-5px_rgba(220,38,38,0.15)]"
                  : "border-transparent text-gray-400 hover:text-gray-900 hover:bg-gray-50/50"
              }`}
            >
              <span className={`${activeTab === tab.key ? "text-red-600 animate-pulse" : "text-gray-300"}`}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-10 py-16 w-full space-y-16">

        {/* TAB: ACCESORIOS V3 */}
        {activeTab === "accesorios" && (
          <section className="bg-white rounded-[50px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] border-2 border-gray-100 overflow-hidden animate-in slide-in-from-bottom duration-700">
            <div className="p-12 border-b-2 border-gray-50 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">Inventario de Componentes</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                    <FileCode size={14} className="text-red-600" /> BASE DE DATOS GLOBAL DE RECEPCIÓN
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
                  <input
                    type="text"
                    value={nuevoAcc}
                    onChange={(e) => setNuevoAcc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAcc()}
                    className="flex-1 px-8 py-5 bg-white border-2 border-gray-200 rounded-[24px] text-lg font-black outline-none focus:border-red-600 transition-all uppercase tracking-tight italic shadow-inner placeholder:text-gray-200"
                    placeholder="IDENTIFICAR NUEVO ITEM..."
                  />
                  <button
                    onClick={addAcc}
                    className="bg-red-600 text-white px-10 py-5 rounded-[24px] text-xs font-black flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-2xl shadow-red-600/30 uppercase tracking-widest active:scale-95"
                  >
                    <Plus size={22} /> ALTA
                  </button>
                </div>
            </div>

            <div className="p-12">
              {loadingAcc ? (
                <div className="p-20 text-center text-gray-300 font-black uppercase tracking-[0.4em] animate-pulse italic">SYNCING CATALOG...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {accesorios.map((a) => (
                    <div
                      key={a.id}
                      className="group flex items-center justify-between bg-gray-50/50 border-2 border-transparent hover:border-red-600/20 hover:bg-white px-6 py-5 rounded-[24px] transition-all duration-300 hover:shadow-2xl shadow-gray-200/50"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                         <div className="w-2 h-2 rounded-full bg-red-600" />
                         <span className="text-sm font-black text-gray-900 uppercase tracking-tight italic truncate">{a.nombre}</span>
                      </div>
                      <button
                        onClick={() => removeAcc(a.id)}
                        className="p-3 text-gray-200 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  {accesorios.length === 0 && (
                    <div className="col-span-full p-32 text-center bg-gray-50/50 rounded-[40px] border-4 border-dashed border-gray-100">
                        <Wrench size={70} className="mx-auto text-gray-200 mb-8 opacity-20 animate-bounce" />
                        <p className="text-base font-black uppercase tracking-[0.4em] text-gray-300 italic">CATÁLOGO INEXISTENTE EN MEMORIA</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB: USUARIOS V3 */}
        {activeTab === "usuarios" && (
          <div className="space-y-16 animate-in slide-in-from-bottom duration-700">
            <div className="flex flex-col lg:flex-row items-end justify-between gap-10">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">Operadores de Planta</h2>
                <div className="flex items-center gap-3 text-gray-400">
                   <Shield size={16} className="text-red-600" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">CONTROL DE JERARQUÍA Y PERMISOS DE CIBERSEGURIDAD</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-8">
                <label className="flex items-center gap-4 text-[10px] font-black text-gray-400 hover:text-red-600 transition-all cursor-pointer uppercase tracking-[0.2em] italic bg-white px-6 py-4 rounded-[20px] shadow-sm border-2 border-gray-100">
                  <input
                    type="checkbox"
                    checked={showInactivos}
                    onChange={(e) => setShowInactivos(e.target.checked)}
                    className="w-6 h-6 rounded-lg border-2 border-gray-200 text-red-600 focus:ring-red-600 cursor-pointer"
                  />
                  MOSTRAR BAJAS DE PERSONAL
                </label>
                <button
                  onClick={abrirNuevo}
                  className="flex items-center gap-4 bg-gray-900 text-white px-10 py-6 rounded-[28px] text-xs font-black hover:bg-red-600 transition-all shadow-2xl shadow-gray-900/20 uppercase tracking-[0.2em] group"
                >
                  <Plus size={22} className="text-red-600 group-hover:text-white transition-colors" /> ALTA DE OPERADOR
                </button>
              </div>
            </div>

            {/* Formulario Rediseñado V3 */}
            {showForm && (
              <div className="bg-white border-2 border-red-600 ring-[15px] ring-red-600/5 rounded-[50px] p-12 lg:p-16 shadow-2xl animate-in zoom-in duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-4 h-full bg-red-600" />
                <div className="flex items-center gap-6 mb-12 border-b-2 border-gray-50 pb-8">
                   <div className="bg-red-600 p-4 rounded-2xl text-white shadow-xl shadow-red-600/30">
                      <HardHat size={32} />
                   </div>
                   <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                      {editingUser ? `MODIFICAR EXPEDIENTE: ${editingUser.nombre.toUpperCase()}` : "EMISIÓN DE NUEVA CREDENCIAL"}
                   </h3>
                </div>

                {errorUser && (
                  <div className="bg-red-600 border-4 border-red-700 text-white px-8 py-6 rounded-[24px] text-sm font-black uppercase tracking-widest mb-12 animate-bounce flex items-center gap-4 shadow-2xl shadow-red-600/40">
                    <AlertCircle size={24} /> {errorUser}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] block pl-2 italic">IDENTIDAD OPERATIVA *</label>
                    <input
                      type="text"
                      value={uNombre}
                      onChange={(e) => setUNombre(e.target.value)}
                      className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[24px] text-lg font-black italic outline-none transition-all uppercase shadow-inner"
                      placeholder="JUAN PÉREZ"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] block pl-2 italic">EMAIL DE ACCESO *</label>
                    <input
                      type="email"
                      value={uEmail}
                      onChange={(e) => setUEmail(e.target.value)}
                      className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[24px] text-lg font-black italic outline-none transition-all uppercase shadow-inner"
                      placeholder="USER@SERVINOA.COM"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] block pl-2 italic">
                      {editingUser ? "RESETEAR CLAVE (SEGURIDAD)" : "PASSWORD DE SISTEMA *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={uPassword}
                        onChange={(e) => setUPassword(e.target.value)}
                        className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[24px] text-lg font-black outline-none transition-all shadow-inner"
                        placeholder={editingUser ? "DEJAR VACÍO..." : "MIN 6 CHARS"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-600 transition-colors"
                      >
                        {showPass ? <EyeOff size={24} /> : <Eye size={24} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] block pl-2 italic">CATEGORÍA DE ACCESO (ROL)</label>
                    <select
                      value={uRol}
                      onChange={(e) => setURol(e.target.value)}
                      className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[24px] text-lg font-black outline-none transition-all uppercase italic tracking-tighter appearance-none cursor-pointer"
                    >
                      {Object.entries(ROL_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  {editingUser && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] block pl-2 italic">ESTADO DE OPERATIVIDAD</label>
                      <button
                        onClick={() => setUActivo(!uActivo)}
                        className={`flex items-center justify-center gap-4 w-full h-[76px] rounded-[24px] text-xs font-black border-4 transition-all uppercase tracking-[0.2em] italic ${uActivo ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xl shadow-emerald-500/10" : "bg-red-50 border-red-200 text-red-700 shadow-xl shadow-red-500/10"}`}
                      >
                        {uActivo ? <><Check size={20} /> ALTA / ACTIVO</> : <><X size={20} /> BAJA / INACTIVO</>}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-6 mt-16 pt-10 border-t-2 border-gray-50">
                  <button
                    onClick={guardarUsuario}
                    disabled={guardandoUser}
                    className="flex-1 bg-red-600 text-white px-10 py-7 rounded-[28px] text-base font-black hover:bg-red-700 transition-all shadow-2xl shadow-red-600/40 uppercase tracking-[0.3em] italic disabled:opacity-50 active:scale-95"
                  >
                    {guardandoUser ? "SINCRONIZANDO..." : editingUser ? "ACTUALIZAR EXPEDIENTE" : "CONFIRMAR ALTA DE PERSONAL"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-10 py-7 bg-white border-2 border-gray-200 text-gray-400 rounded-[28px] text-base font-black hover:bg-gray-50 hover:text-gray-900 transition-all uppercase tracking-widest italic"
                  >
                    ABORTAR
                  </button>
                </div>
              </div>
            )}

            {/* TABLA DE USUARIOS V3 */}
            <div className="bg-white rounded-[50px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] border-2 border-gray-100 overflow-hidden">
              {loadingUsers ? (
                <div className="p-32 text-center text-gray-300 font-black uppercase tracking-[0.4em] animate-pulse italic">SCANNING BIOMETRIC DATA...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-gray-400 uppercase text-[11px] font-black tracking-[0.4em] bg-gray-50/50 italic">
                        <th className="text-left px-12 py-8">OPERADOR / ID</th>
                        <th className="text-left px-12 py-8">CREDENCIAL</th>
                        <th className="text-left px-12 py-8">JERARQUÍA</th>
                        <th className="text-left px-12 py-8">ESTADO</th>
                        <th className="text-right px-12 py-8">SISTEMA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-50">
                      {usuariosFiltrados.map((u) => (
                        <tr key={u.id} className={`hover:bg-gray-50/50 group transition-all duration-300 ${!u.activo ? "opacity-30 grayscale" : ""}`}>
                          <td className="px-12 py-8">
                            <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-[22px] bg-gray-900 border-2 border-gray-800 flex items-center justify-center text-white font-black text-xl shadow-2xl group-hover:rotate-6 transition-all group-hover:scale-110">
                                {u.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                  <div className="font-black text-gray-900 uppercase italic text-lg tracking-tighter leading-none flex items-center gap-3">
                                    {u.nombre}
                                    {u.id === (session?.user as { id?: string })?.id && (
                                      <div className="flex items-center gap-2 text-[8px] bg-red-600 text-white px-3 py-1 rounded-full font-black animate-pulse shadow-lg shadow-red-600/30">
                                         <Lock size={10} /> SESSION_AUTH
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-gray-300 font-black uppercase tracking-[0.3em] mt-2 group-hover:text-red-600/50 transition-colors">OPERATOR_ID: {u.id.substring(0,10).toUpperCase()}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-12 py-8">
                             <div className="text-sm font-black text-gray-400 italic lowercase tracking-tight group-hover:text-gray-900 transition-colors">{u.email}</div>
                          </td>
                          <td className="px-12 py-8">
                             <span className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.25em] border-2 shadow-sm italic ${ROL_COLORS[u.rol] || "border-gray-100 text-gray-400 bg-gray-50"}`}>
                               {ROL_LABELS[u.rol] || u.rol.toUpperCase()}
                             </span>
                          </td>
                          <td className="px-12 py-8">
                             <div className="flex items-center gap-4">
                                <div className={`w-4 h-4 rounded-full border-2 ${u.activo ? "bg-emerald-500 border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "bg-red-500 border-red-200"}`} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-900 italic">{u.activo ? "ENABLED" : "DISABLED"}</span>
                             </div>
                          </td>
                          <td className="px-12 py-8 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => abrirEditar(u)}
                                className="p-4 text-gray-200 hover:text-red-600 hover:bg-gray-100 rounded-2xl transition-all border-2 border-transparent hover:border-gray-200 active:scale-90"
                              >
                                <Edit2 size={22} />
                              </button>
                              <button
                                onClick={() => toggleActivo(u)}
                                disabled={u.id === (session?.user as { id?: string })?.id}
                                className={`p-4 rounded-2xl transition-all disabled:opacity-20 border-2 border-transparent active:scale-90 ${
                                  u.activo
                                    ? "text-gray-100 hover:text-red-700 hover:bg-red-50 hover:border-red-100"
                                    : "text-gray-100 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-100"
                                }`}
                              >
                                {u.activo ? <X size={22} /> : <Check size={22} />}
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

            <div className="p-12 bg-gray-900 rounded-[40px] border-4 border-gray-800 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-8">
                   <div className="p-4 bg-red-600 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                      <AlertCircle size={32} className="text-white" />
                   </div>
                   <div className="space-y-2">
                     <p className="text-xs font-black text-gray-100 uppercase tracking-[0.3em] italic">PROTOCOLO DE SEGURIDAD OPERATIVA</p>
                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.25em] italic leading-relaxed max-w-4xl">
                        EL BLOQUEO DE CREDENCIALES REVOCA EL ACCESO AL NÚCLEO DE DATOS DE FORMA INMEDIATA. TODAS LAS INTERVENCIONES PREVIAS DEL OPERADOR PERMANECEN ENCRIPTADAS EN EL HISTORIAL PARA TRAZABILIDAD LEGAL.
                     </p>
                   </div>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
