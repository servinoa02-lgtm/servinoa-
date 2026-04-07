"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Settings, Trash2, Plus, Users, Shield, Wrench,
  ArrowLeft, Eye, EyeOff, Check, X, Edit2, RefreshCw
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
  ADMIN: "Administrador",
  TECNICO: "Técnico",
  CAJA: "Caja",
  VENTAS: "Ventas",
};

const ROL_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  TECNICO: "bg-blue-100 text-blue-700",
  CAJA: "bg-green-100 text-green-700",
  VENTAS: "bg-orange-100 text-orange-700",
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
      body: JSON.stringify({ nombre: nuevoAcc.trim() }),
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
    if (!uNombre.trim() || !uEmail.trim()) { setErrorUser("Nombre y email son requeridos"); return; }
    if (!editingUser && !uPassword.trim()) { setErrorUser("La contraseña es requerida para nuevos usuarios"); return; }
    setGuardandoUser(true);
    setErrorUser("");

    const body: Record<string, unknown> = { nombre: uNombre, email: uEmail, rol: uRol, activo: uActivo };
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
      setErrorUser(err.error || "Error al guardar");
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

  if (status === "loading") return <div className="p-10 text-center animate-pulse">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft size={18} />
          </button>
          <Settings className="text-slate-500" size={20} />
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Configuración del Sistema</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 flex gap-1 pt-3">
          {[
            { key: "accesorios" as ActiveTab, label: "Catálogo de Accesorios", icon: <Wrench size={16} /> },
            { key: "usuarios" as ActiveTab, label: "Técnicos y Usuarios", icon: <Users size={16} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* TAB: ACCESORIOS */}
        {activeTab === "accesorios" && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-800">Catálogo Global de Accesorios</h2>
              <p className="text-sm text-slate-500 mt-1">
                Administrá las opciones de checklist al ingresar equipos nuevos en el taller.
              </p>
            </div>

            <div className="flex gap-2 mb-6 max-w-sm">
              <input
                type="text"
                value={nuevoAcc}
                onChange={(e) => setNuevoAcc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAcc()}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Ej: Control remoto, cable, manual..."
              />
              <button
                onClick={addAcc}
                className="bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-slate-700"
              >
                <Plus size={16} /> Añadir
              </button>
            </div>

            {loadingAcc ? (
              <p className="text-sm text-slate-400 animate-pulse">Cargando accesorios...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {accesorios.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg"
                  >
                    <span className="text-sm font-medium text-slate-700 truncate">{a.nombre}</span>
                    <button
                      onClick={() => removeAcc(a.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors ml-2 flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {accesorios.length === 0 && (
                  <p className="text-sm text-slate-400 col-span-4">Sin accesorios registrados.</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB: USUARIOS */}
        {activeTab === "usuarios" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Técnicos y Usuarios del Sistema</h2>
                <p className="text-sm text-slate-500 mt-0.5">Gestioná los accesos y roles del personal.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInactivos}
                    onChange={(e) => setShowInactivos(e.target.checked)}
                    className="rounded"
                  />
                  Mostrar inactivos
                </label>
                <button
                  onClick={cargarUsuarios}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  title="Actualizar"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={abrirNuevo}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm"
                >
                  <Plus size={16} /> Nuevo Usuario
                </button>
              </div>
            </div>

            {/* Formulario nuevo/editar */}
            {showForm && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4">
                  {editingUser ? `Editar: ${editingUser.nombre}` : "Nuevo Usuario / Técnico"}
                </h3>

                {errorUser && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                    {errorUser}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Nombre completo *</label>
                    <input
                      type="text"
                      value={uNombre}
                      onChange={(e) => setUNombre(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={uEmail}
                      onChange={(e) => setUEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="juan@servinoa.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                      {editingUser ? "Nueva contraseña (dejar vacío = sin cambio)" : "Contraseña *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={uPassword}
                        onChange={(e) => setUPassword(e.target.value)}
                        className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder={editingUser ? "(sin cambio)" : "Mínimo 6 caracteres"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Rol</label>
                    <select
                      value={uRol}
                      onChange={(e) => setURol(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {Object.entries(ROL_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {editingUser && (
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-slate-600">Estado</label>
                      <button
                        onClick={() => setUActivo(!uActivo)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${uActivo ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}
                      >
                        {uActivo ? <><Check size={14} /> Activo</> : <><X size={14} /> Inactivo</>}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={guardarUsuario}
                    disabled={guardandoUser}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {guardandoUser ? "Guardando..." : editingUser ? "Guardar Cambios" : "Crear Usuario"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Tabla de usuarios */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {loadingUsers ? (
                <div className="p-8 text-center text-slate-400 animate-pulse text-sm">Cargando usuarios...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-slate-600">Nombre</th>
                      <th className="text-left px-5 py-3 font-semibold text-slate-600">Email</th>
                      <th className="text-left px-5 py-3 font-semibold text-slate-600">Rol</th>
                      <th className="text-left px-5 py-3 font-semibold text-slate-600">Estado</th>
                      <th className="text-right px-5 py-3 font-semibold text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((u) => (
                      <tr key={u.id} className={`border-b border-slate-100 ${!u.activo ? "opacity-50" : "hover:bg-slate-50"}`}>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                              {u.nombre.charAt(0).toUpperCase()}
                            </div>
                            {u.nombre}
                            {u.id === (session?.user as { id?: string })?.id && (
                              <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Yo</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROL_COLORS[u.rol] || "bg-slate-100 text-slate-600"}`}>
                            {ROL_LABELS[u.rol] || u.rol}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => abrirEditar(u)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => toggleActivo(u)}
                              disabled={u.id === (session?.user as { id?: string })?.id}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${
                                u.activo
                                  ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  : "text-slate-400 hover:text-green-600 hover:bg-green-50"
                              }`}
                              title={u.activo ? "Desactivar" : "Activar"}
                            >
                              {u.activo ? <X size={15} /> : <Check size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {usuariosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <p className="text-xs text-slate-400 px-1">
              * Los usuarios desactivados no pueden iniciar sesión. No se eliminan para preservar el historial.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
