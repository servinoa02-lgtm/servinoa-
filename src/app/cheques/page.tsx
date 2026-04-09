"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Search, Plus, CreditCard, Landmark, 
  History, AlertCircle, Calendar,
  User, Building2, Timer
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Toast } from "@/components/ui/Toast";
import { formatFecha } from "@/lib/dateUtils";

interface Cheque {
  id: string;
  estado: string;
  numeroCheque?: string | null;
  banco?: string | null;
  librador?: string | null;
  importe: number;
  fechaIngreso: string;
  fechaEmision?: string | null;
  fechaCobro?: string | null;
  endosadoA?: string | null;
  descripcion?: string | null;
  diasVencimiento?: number | null;
  vencimientoTexto?: string;
  cliente?: { nombre: string; empresa?: { nombre: string } | null } | null;
}

interface Cliente { id: string; nombre: string; empresa?: { nombre: string } | null; }

export default function ChequesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [numeroCheque, setNumeroCheque] = useState("");
  const [banco, setBanco] = useState("");
  const [librador, setLibrador] = useState("");
  const [importe, setImporte] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaCobro, setFechaCobro] = useState("");
  const [endosadoA, setEndosadoA] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estadoForm, setEstadoForm] = useState("EN_CARTERA");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/cheques")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar cheques");
        return r.json();
      })
      .then((d) => { setCheques(d); setLoading(false); })
      .catch((e) => {
        setLoading(false);
        setToast({ message: e.message, type: "error" });
      });
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
  }, []);

  const filtrados = cheques.filter((c: Cheque) => {
    const texto = busqueda.toLowerCase();
    return (
      (c.numeroCheque || "").includes(texto) ||
      (c.librador || "").toLowerCase().includes(texto) ||
      (c.banco || "").toLowerCase().includes(texto) ||
      (c.cliente?.nombre || "").toLowerCase().includes(texto)
    );
  });

  const guardar = async () => {
    if (!importe) return;
    setGuardando(true);
    try {
      const res = await fetch("/api/cheques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          clienteId: clienteId || null, 
          numeroCheque, 
          banco: banco.toUpperCase(), 
          librador: librador.toUpperCase(), 
          importe, 
          fechaEmision, 
          fechaCobro, 
          endosadoA, 
          descripcion: (descripcion || "").toUpperCase(), 
          estado: estadoForm 
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al registrar cheque");
      }
      setMostrarForm(false);
      setNumeroCheque(""); setBanco(""); setLibrador(""); setImporte(""); setFechaEmision(""); setFechaCobro(""); setEndosadoA(""); setDescripcion(""); setClienteId("");
      setToast({ message: "Cheque registrado correctamente", type: "success" });
      cargar();
    } catch (e: any) {
      setToast({ message: e.message || "Error al registrar cheque", type: "error" });
    } finally {
      setGuardando(false);
    }
  };

  if (status === "loading" || loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-amber-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando cheques...</div>
    </div>
  );

  const totalCartera = cheques
    .filter((c: Cheque) => c.estado === "EN_CARTERA")
    .reduce((sum: number, c: Cheque) => sum + c.importe, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/cajas" className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tesorería</p>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Cartera de Cheques</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
             <div className="hidden md:block bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Total en Cartera</p>
                <p className="text-lg font-bold tabular-nums text-amber-700">
                  ${totalCartera.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </p>
             </div>
             <button
              onClick={() => setMostrarForm(true)}
              className="bg-red-600 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-1.5 md:gap-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Recibir</span> Cheque
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 w-full space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
           <div className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por n°, librador, banco o cliente..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-red-600 rounded-xl text-sm font-medium outline-none transition-all"
              />
           </div>
           <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 italic">
              {filtrados.length} valores encontrados
           </div>
        </div>

        <div className="space-y-4">
          {filtrados.map((c: Cheque) => (
            <div 
              key={c.id} 
              className="group bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-4">
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Origen / Cliente</p>
                   <p className="text-base font-bold text-gray-900 leading-tight uppercase">
                    {c.cliente?.empresa?.nombre
                      ? `${c.cliente.empresa.nombre} - ${c.cliente.nombre}`
                      : c.cliente?.nombre || "Emisor Particular"}
                   </p>
                   <div className="flex items-center gap-1.5 mt-2 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit text-[10px] font-bold uppercase">
                      <Landmark size={12} /> {c.banco || "S/D"}
                   </div>
                </div>

                <div className="md:col-span-3">
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Librador / N°</p>
                   <p className="text-sm font-bold text-gray-600 uppercase">{c.librador || "N/A"}</p>
                   <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase">N°: {c.numeroCheque || "----"}</p>
                </div>

                <div className="md:col-span-2">
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha Cobro</p>
                   <p className="text-sm font-bold text-gray-900">
                      {c.fechaCobro ? formatFecha(c.fechaCobro) : "Inmediata"}
                   </p>
                   <div className="flex items-center gap-1.5 mt-1">
                       <Timer size={12} className={c.diasVencimiento != null && c.diasVencimiento < 0 ? "text-red-500" : "text-gray-300"} />
                       <span className={`text-[10px] font-bold uppercase ${c.diasVencimiento != null && c.diasVencimiento < 0 ? "text-red-600" : "text-gray-400"}`}>
                          {c.vencimientoTexto || "S/D"}
                       </span>
                   </div>
                </div>

                <div className="md:col-span-3 text-right">
                   <p className="text-xl font-bold tabular-nums text-gray-900 mb-2">
                      ${c.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                   </p>
                   <StatusBadge status={c.estado} />
                </div>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
               <Landmark size={48} className="text-gray-100 mx-auto mb-4" />
               <p className="text-gray-400 font-medium">No se encontraron cheques</p>
            </div>
          )}
        </div>
      </main>

      <Drawer 
        isOpen={mostrarForm} 
        onClose={() => setMostrarForm(false)} 
        title="Recibir Cheque"
      >
        <div className="p-1 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Cliente / Origen</label>
            <select 
              value={clienteId} onChange={e => setClienteId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none uppercase appearance-none cursor-pointer"
            >
              <option value="">SIN CLIENTE ASIGNADO</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} - ${c.nombre}`.toUpperCase() : c.nombre.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Importe del Cheque</label>
             <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input 
                  type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-xl font-bold outline-none transition-all placeholder:text-gray-200" 
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">N° Cheque</label>
                <input type="text" value={numeroCheque} onChange={e => setNumeroCheque(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none" />
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Banco</label>
                <input type="text" value={banco} onChange={e => setBanco(e.target.value)}
                  placeholder="Banco emisor..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none uppercase placeholder:text-gray-300" />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Librador (Firmante)</label>
             <input type="text" value={librador} onChange={e => setLibrador(e.target.value)}
               placeholder="Nombre de quien firma..."
               className="w-full px-5 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none uppercase placeholder:text-gray-300" />
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fecha Emisión</label>
                <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)}
                  className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm outline-none" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-red-600">Fecha Cobro</label>
                <input type="date" value={fechaCobro} onChange={e => setFechaCobro(e.target.value)}
                  className="w-full bg-white border border-red-200 p-2 rounded-lg text-sm outline-none" />
             </div>
          </div>

          <div className="pt-6">
            <button
              onClick={guardar} disabled={guardando || !importe}
              className="w-full py-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
            >
              {guardando ? "Procesando..." : "Confirmar Recepción"}
            </button>
          </div>
        </div>
      </Drawer>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
