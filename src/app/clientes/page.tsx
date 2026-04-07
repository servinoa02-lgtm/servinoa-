"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search, Building2, User, Phone, Mail, FileText, ArrowLeft, Trash2, ChevronRight, Contact, Briefcase } from "lucide-react";
import { Table } from "@/components/ui/Table";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";

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
      .then((r) => r.json())
      .then((data) => { setClientes(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

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
      setErrorDelete(data.error || "ERROR CRÍTICO EN ELIMINACIÓN");
      return;
    }
    setConfirmDelete(null);
    cargar();
  };

  const guardarCliente = async () => {
    if (!fNombre.trim()) return;
    setGuardando(true);
    await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: fNombre.toUpperCase(),
        empresaNombre: fEmpresa ? fEmpresa.toUpperCase() : null,
        telefono: fTelefono || null,
        email: fEmail || null,
        dni: fDni || null,
        domicilio: fDomicilio ? fDomicilio.toUpperCase() : null,
        iva: fIva,
      }),
    });
    setMostrarForm(false);
    setFNombre(""); setFEmpresa(""); setFTelefono(""); setFEmail(""); setFDni(""); setFDomicilio("");
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
        ACCEDIENDO AL PADRÓN CENTRAL DE CLIENTES...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans animate-in fade-in duration-500">
      <header className="bg-white border-b border-gray-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="p-3 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200 active:scale-90">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Logística</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">Clientes y Empresas</h1>
            </div>
          </div>
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-3 bg-red-600 text-white px-10 py-5 rounded-2xl text-xs font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 uppercase tracking-[0.2em] active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">ALTA DE CLIENTE</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-10 py-12 w-full lg:space-y-12">
        {/* Barra de Filtros Industrial */}
        <div className="flex flex-col lg:flex-row items-end justify-between gap-10">
          <div className="relative w-full max-w-2xl group">
             <div className="absolute left-6 top-1/2 -translate-y-1/2 transition-all group-focus-within:scale-110">
                <Search className="text-gray-400 group-focus-within:text-red-600" size={24} />
             </div>
             <input
               type="text"
               placeholder="FILTRAR POR NOMBRE, EMPRESA O CONTACTO..."
               value={busqueda}
               onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
               className="w-full pl-16 pr-8 py-6 bg-white border-2 border-transparent focus:border-red-600 rounded-[28px] text-lg font-black italic text-gray-900 placeholder:text-gray-200 outline-none transition-all shadow-2xl shadow-gray-200/50 uppercase tracking-tight"
             />
          </div>
          <div className="flex items-center gap-4 bg-gray-900 text-white px-8 py-4 rounded-[20px] shadow-xl border-2 border-gray-800">
             <Briefcase size={20} className="text-red-600" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">
                {filtrados.length} REGISTROS ACTIVOS
             </span>
          </div>
        </div>

        {/* Tabla de Resultados V3 */}
        <div className="bg-white border-2 border-gray-100 rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-700">
          <Table
            data={filtrados}
            onRowClick={(c) => router.push(`/clientes/${c.id}`)}
            emptyMessage="LA BASE DE DATOS NO ARROJA COINCIDENCIAS PARA EL FILTRO APLICADO."
            columns={[
              {
                header: "IDENTIDAD COMERCIAL",
                cell: (c) => (
                  <div className="flex items-center gap-4 p-2">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                       <Building2 size={20} />
                    </div>
                    <span className="font-black text-gray-900 uppercase text-sm tracking-tight italic">{c.empresa?.nombre || "CLIENTE PARTICULAR"}</span>
                  </div>
                )
              },
              {
                header: "TITULAR DE CUENTA",
                cell: (c) => (
                  <div className="flex flex-col py-2">
                    <span className="font-black text-red-600 uppercase text-lg italic tracking-tighter leading-none">{c.nombre}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 opacity-60">SISTEMA ID: {c.id.substring(0,8).toUpperCase()}</span>
                  </div>
                )
              },
              {
                header: "PROTOCOLOS DE CONTACTO",
                cell: (c) => (
                  <div className="flex flex-col gap-2 text-[10px] text-gray-600 font-black uppercase tracking-widest italic py-2">
                    <div className="flex items-center gap-3"><Phone size={14} className="text-red-600 opacity-50"/> {c.telefono || "PENDIENTE"}</div>
                    <div className="flex items-center gap-3"><Mail size={14} className="text-red-600 opacity-50"/> {c.email || "NO REGISTRA"}</div>
                  </div>
                )
              },
              {
                header: "LIQUIDACIÓN / SALDO",
                cell: (c) => (
                  <div className="font-black py-2">
                    <div className={`px-5 py-2.5 rounded-2xl border-2 text-base italic tracking-tighter tabular-nums text-right inline-block ${c.saldo && c.saldo > 0 ? "text-red-600 bg-red-50 border-red-100" : "text-emerald-700 bg-emerald-50 border-emerald-100"}`}>
                      ${(c.saldo || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )
              },
              {
                header: "DETERMINACIÓN FISCAL",
                cell: (c) => (
                  <div className="flex items-center gap-3 py-2">
                    <FileText size={18} className="text-gray-300" />
                    <span className="font-black text-gray-400 uppercase text-[10px] tracking-[0.2em] italic leading-tight">
                       {c.iva.includes("NO") ? "CONSUMIDOR FINAL" : c.iva.toUpperCase()}
                    </span>
                  </div>
                )
              },
              {
                header: "ACCIONES",
                cell: (c) => (
                  <div className="flex items-center justify-end gap-2 pr-4">
                     <button
                       onClick={(e) => { e.stopPropagation(); setErrorDelete(null); setConfirmDelete({ id: c.id, nombre: c.nombre }); }}
                       className="p-4 text-gray-200 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border-2 border-transparent hover:border-red-100 bg-gray-50/50"
                       title="INICIAR PROTOCOLO DE BAJA"
                     >
                       <Trash2 size={20} />
                     </button>
                     <ChevronRight size={24} className="text-gray-200 group-hover:text-red-600 group-hover:translate-x-2 transition-all" />
                  </div>
                )
              }
            ]}
          />
        </div>
      </main>

      {/* Drawer: Nuevo Cliente Industrial */}
      <Drawer
        isOpen={mostrarForm}
        onClose={() => setMostrarForm(false)}
        title="ALTA DE CLIENTE — PROTOCOLO DE REGISTRO"
      >
        <div className="space-y-10 p-4 select-none">
          <div className="space-y-4">
             <div className="flex items-center gap-3 text-gray-400">
                <Briefcase size={16} />
                <label className="text-[10px] font-black uppercase tracking-[0.3em] italic">Razón Social / Empresa</label>
             </div>
             <input type="text" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)}
              placeholder="EJ. CONSTRUCTORA DEL NORTE S.A."
              className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-lg font-black italic outline-none transition-all uppercase tracking-tight shadow-inner" />
          </div>
          
          <div className="space-y-4">
             <div className="flex items-center gap-3 text-gray-400">
                <Contact size={16} />
                <label className="text-[10px] font-black uppercase tracking-[0.3em] italic">Titular / Persona Física *</label>
             </div>
             <input type="text" value={fNombre} onChange={(e) => setFNombre(e.target.value)}
              placeholder="NOMBRE Y APELLIDO..."
              className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-lg font-black italic outline-none transition-all uppercase tracking-tight shadow-inner" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic pl-1">DNI / CUIT / CUIL</label>
               <input type="text" value={fDni} onChange={(e) => setFDni(e.target.value)}
                 className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-lg font-black italic outline-none shadow-inner" />
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic pl-1">TELÉFONO CELULAR</label>
               <input type="tel" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)}
                 className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-lg font-black italic outline-none shadow-inner" />
            </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic pl-1">CORREO ELECTRÓNICO OFICIAL</label>
             <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)}
               className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-lg font-black italic outline-none shadow-inner" />
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic pl-1">DOMICILIO FISCAL / LEGAL</label>
             <input type="text" value={fDomicilio} onChange={(e) => setFDomicilio(e.target.value.toUpperCase())}
               className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-lg font-black italic outline-none shadow-inner uppercase" />
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic pl-1">CONDICIÓN IMPOSITIVA</label>
             <select value={fIva} onChange={(e) => setFIva(e.target.value)}
               className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-2xl text-xs font-black italic outline-none transition-all uppercase tracking-[0.2em] appearance-none cursor-pointer">
               <option value="NO incluyen IVA">EXENTO — CONSUMIDOR FINAL</option>
               <option value="Incluyen IVA">INSCRIPTO — APLICAR IVA EN LIQUIDACIONES</option>
             </select>
          </div>

          <div className="pt-12">
            <button
              onClick={guardarCliente}
              disabled={guardando || !fNombre.trim()}
              className="w-full py-6 bg-red-600 text-white rounded-[24px] text-base font-black hover:bg-red-700 disabled:opacity-50 transition-all shadow-2xl shadow-red-600/30 uppercase tracking-[0.3em] active:scale-95"
            >
              {guardando ? (
                <span className="animate-pulse">SINCRO DE DATOS...</span>
              ) : (
                "VINCULAR NUEVO CLIENTE"
              )}
            </button>
          </div>
        </div>
      </Drawer>

      {/* ConfirmDialog: Eliminar Cliente */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Protocolo de Baja"
        message={`¿CONFIRMA LA ELIMINACIÓN PERMANENTE DE "${confirmDelete?.nombre.toUpperCase()}"? ESTA ACCIÓN ES IRREVERSIBLE EN EL PADRÓN ACTUAL.`}
        confirmLabel={eliminando ? "EJECUTANDO..." : "SÍ, ELIMINAR REGISTRO"}
        onCancel={() => { setConfirmDelete(null); setErrorDelete(null); }}
        onConfirm={() => confirmDelete && eliminarCliente(confirmDelete.id)}
      />

      {/* Error al eliminar */}
      {errorDelete && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border-2 border-red-600 text-red-600 font-black uppercase tracking-widest px-10 py-6 rounded-3xl shadow-[0_20px_50px_rgba(220,38,38,0.3)] animate-in slide-in-from-bottom duration-500 italic">
          {errorDelete}
          <button onClick={() => setErrorDelete(null)} className="ml-6 underline text-[10px]">CERRAR</button>
        </div>
      )}
    </div>
  );
}

