"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Plus, Search, Building2, Phone, Mail, FileText, ArrowLeft, Trash2, ChevronRight, Contact, Briefcase } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { RoleGuard } from "@/components/auth/RoleGuard";
import Link from "next/link";
import { formatoService } from "@/services/formatoService";

interface Cliente {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  dni?: string | null;
  domicilio?: string | null;
  iva: string;
  empresa?: { nombre: string } | null;
  saldo?: number;
  _count?: { ordenes: number; presupuestos: number };
}

export default function ClientesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorDelete, setErrorDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Formulario nuevo cliente
  const [fNombre, setFNombre] = useState("");
  const [fEmpresa, setFEmpresa] = useState("");
  const [fTelefono, setFTelefono] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fDni, setFDni] = useState("");
  const [fDomicilio, setFDomicilio] = useState("");
  const [fIva, setFIva] = useState("NO incluyen IVA");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/clientes")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar clientes");
        return r.json();
      })
      .then((data) => { setClientes(data); setLoading(false); })
      .catch((e) => {
        setLoading(false);
        setToast({ message: e.message, type: "error" });
      });
  };

  useEffect(() => { cargar(); }, []);
  useAutoRefresh(cargar);

  const filtrados = clientes.filter((c) => {
    const texto = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(texto) ||
      (c.empresa?.nombre || "").toLowerCase().includes(texto) ||
      (c.telefono || "").includes(texto) ||
      (c.email || "").toLowerCase().includes(texto)
    );
  });

  const eliminarCliente = async (id: string) => {
    setEliminando(true);
    setErrorDelete(null);
    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    const data = await res.json();
    setEliminando(false);
    if (!res.ok) {
      setErrorDelete(data.error || "Error al eliminar cliente");
      return;
    }
    setConfirmDelete(null);
    cargar();
  };

  const guardarCliente = async () => {
    if (!fNombre.trim()) return;
    setGuardando(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formatoService.capitalizarPalabras(fNombre),
          empresaNombre: fEmpresa ? formatoService.capitalizarPalabras(fEmpresa) : null,
          telefono: fTelefono || null,
          email: fEmail || null,
          dni: fDni || null,
          domicilio: fDomicilio ? formatoService.capitalizarPalabras(fDomicilio) : null,
          iva: fIva,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear cliente");
      }
      setMostrarForm(false);
      setFNombre(""); setFEmpresa(""); setFTelefono(""); setFEmail(""); setFDni(""); setFDomicilio("");
      setToast({ message: "Cliente creado correctamente", type: "success" });
      cargar();
    } catch (e: any) {
      setToast({ message: e.message || "Error al crear cliente", type: "error" });
    } finally {
      setGuardando(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-40">
        <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN", "JEFE", "ADMINISTRACION"]}>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/dashboard" className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Contactos</p>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Clientes y Empresas</h1>
            </div>
          </div>
          <button
            onClick={() => setMostrarForm(true)}
            className="bg-red-600 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-1.5 md:gap-2"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo</span> Cliente
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 w-full space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 md:p-4 rounded-2xl border border-gray-200 shadow-sm">
           <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por nombre, empresa o contacto..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-red-600 rounded-xl text-sm font-medium outline-none transition-all"
              />
           </div>
           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 italic">
              {filtrados.length} clientes encontrados
           </div>
        </div>

        {/* ─── Desktop: Tabla ─── */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="text-left px-6 py-4">Titular / Empresa</th>
                  <th className="text-left px-6 py-4">Contacto</th>
                  <th className="text-right px-6 py-4">Saldo</th>
                  <th className="text-left px-6 py-4">Condición</th>
                  <th className="text-right px-6 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 group transition-all cursor-pointer"
                    onClick={() => router.push(`/clientes/${c.id}`)}
                  >
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 uppercase text-sm leading-tight mb-1">{c.nombre}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-2">
                        <Building2 size={12} className="opacity-50" />
                        {c.empresa?.nombre || "Particular"}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                        <span className="flex items-center gap-2"><Phone size={12} className="text-red-600/50" /> {c.telefono || "---"}</span>
                        <span className="flex items-center gap-2"><Mail size={12} className="text-red-600/50" /> {c.email || "---"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <span className={`px-4 py-1.5 rounded-xl border font-bold text-sm shadow-sm inline-block tabular-nums ${(c.saldo ?? 0) > 0 ? "text-red-600 bg-red-50 border-red-100" : "text-emerald-700 bg-emerald-50 border-emerald-100"}`}>
                        ${(c.saldo ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                          <FileText size={14} className="opacity-30" />
                          {c.iva.includes("NO") ? "Cons. Final" : c.iva}
                       </div>
                    </td>
                    <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                       <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirmDelete({ id: c.id, nombre: c.nombre })}
                            className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                          <ChevronRight size={20} className="text-gray-200 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                       </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium bg-gray-50/20 italic">
                       No se encontraron clientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Mobile: Cards ─── */}
        <div className="md:hidden space-y-3">
          {filtrados.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/clientes/${c.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900 uppercase text-sm">{c.nombre}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1 mt-0.5">
                    <Building2 size={10} className="opacity-50" />
                    {c.empresa?.nombre || "Particular"}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-lg border font-bold text-xs tabular-nums ${(c.saldo ?? 0) > 0 ? "text-red-600 bg-red-50 border-red-100" : "text-emerald-700 bg-emerald-50 border-emerald-100"}`}>
                  ${(c.saldo ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase mt-2 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1"><Phone size={10} className="text-red-600/50" /> {c.telefono || "---"}</span>
                <span className="flex items-center gap-1"><Mail size={10} className="text-red-600/50" /> {c.email || "---"}</span>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div className="text-center py-16 text-gray-400 font-medium italic text-sm">
              No se encontraron clientes
            </div>
          )}
        </div>
      </main>

      <Drawer
        isOpen={mostrarForm}
        onClose={() => setMostrarForm(false)}
        title="Nuevo Cliente"
      >
        <div className="p-1 space-y-6">
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Empresa / Razón Social</label>
                <input type="text" value={fEmpresa} onChange={(e) => setFEmpresa(formatoService.capitalizarPalabras(e.target.value))}
                  placeholder="Nombre de la empresa (Opcional)..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none" />
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nombre Completo *</label>
                <input type="text" value={fNombre} onChange={(e) => setFNombre(formatoService.capitalizarPalabras(e.target.value))}
                  placeholder="Nombre del titular o particular..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none" />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">DNI / CUIT</label>
                   <input type="text" value={fDni} onChange={(e) => setFDni(e.target.value)}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Teléfono</label>
                   <input type="tel" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none" />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none" />
             </div>

             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Domicilio</label>
                <input type="text" value={fDomicilio} onChange={(e) => setFDomicilio(formatoService.capitalizarPalabras(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none" />
             </div>

             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">IVA / Fiscal</label>
                <select value={fIva} onChange={(e) => setFIva(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-xs font-bold outline-none uppercase appearance-none cursor-pointer">
                  <option value="NO incluyen IVA">Exento / Consumidor Final</option>
                  <option value="Incluyen IVA">Inscripto (Aplica IVA)</option>
                </select>
             </div>
          </div>

          <div className="pt-6">
            <button
              onClick={guardarCliente}
              disabled={guardando || !fNombre.trim()}
              className="w-full py-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
            >
              {guardando ? "Guardando..." : "Vincular Cliente"}
            </button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar Cliente"
        message={`¿Estás seguro de eliminar el registro de "${confirmDelete?.nombre.toUpperCase()}"? Esta acción no se puede deshacer.`}
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && eliminarCliente(confirmDelete.id)}
      />

      {errorDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-red-600 text-red-100 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom">
          <span className="w-2 h-2 rounded-full bg-red-600" />
          {errorDelete}
          <button onClick={() => setErrorDelete(null)} className="ml-4 text-[10px] uppercase underline text-gray-400">Cerrar</button>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
    </RoleGuard>
  );
}
