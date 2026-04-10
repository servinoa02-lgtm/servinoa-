"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { 
  ArrowLeft, ArrowRightLeft, History, 
  Calendar, ArrowRight, ArrowUpRight, ArrowDownLeft 
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { formatFecha } from "@/lib/dateUtils";
import { formatoService } from "@/services/formatoService";

interface Transferencia {
  id: string;
  fecha: string;
  monto: number;
  descripcion?: string | null;
  formaPagoOrigen: string;
  formaPagoDestino: string;
  cajaOrigen: { nombre: string };
  cajaDestino: { nombre: string };
}

interface Caja { id: string; nombre: string; }

const FORMAS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA", "MERCADO PAGO", "OTRO"];

function TransferenciasContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaOrigenId, setCajaOrigenId] = useState("");
  const [cajaDestinoId, setCajaDestinoId] = useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [formaPagoOrigen, setFormaPagoOrigen] = useState("EFECTIVO");
  const [formaPagoDestino, setFormaPagoDestino] = useState("EFECTIVO");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/cajas/transferencias")
      .then((r) => r.json())
      .then((d) => { setTransferencias(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    fetch("/api/cajas").then((r) => r.json()).then((d) => {
      setCajas(d);
      const origenQuery = searchParams.get("origen");
      if (origenQuery && d.some((c: Caja) => c.id === origenQuery)) {
        setCajaOrigenId(origenQuery);
        setMostrarForm(true);
        if (d.length >= 2) {
           setCajaDestinoId(d.find((c: Caja) => c.id !== origenQuery)?.id || d[0].id);
        }
      } else if (d.length >= 2) { 
        setCajaOrigenId(d[0].id); setCajaDestinoId(d[1].id); 
      }
    });
  }, [searchParams]);

  const guardar = async () => {
    if (!cajaOrigenId || !cajaDestinoId || !monto || cajaOrigenId === cajaDestinoId) return;
    setGuardando(true);

    await fetch("/api/cajas/transferencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        cajaOrigenId, 
        cajaDestinoId, 
        monto, 
        descripcion: formatoService.capitalizarPrimeraLetra(descripcion || "Transferencia operativa"), 
        formaPagoOrigen, 
        formaPagoDestino 
      }),
    });

    setMostrarForm(false);
    setMonto(""); setDescripcion("");
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando transferencias...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/cajas" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tesorería</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transferencias entre Cajas</h1>
            </div>
          </div>
          <button
            onClick={() => setMostrarForm(true)}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-2"
          >
            <ArrowRightLeft size={18} /> Nueva Transferencia
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full space-y-8">
        <div className="space-y-4">
          {transferencias.map((t, idx) => (
            <div 
              key={t.id} 
              className="group bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-4">
                   <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center min-w-[120px]">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Origen</p>
                      <p className="text-sm font-bold text-gray-900 uppercase">{t.cajaOrigen.nombre}</p>
                   </div>
                   <ArrowRight size={20} className="text-gray-300" />
                   <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center min-w-[120px]">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Destino</p>
                      <p className="text-sm font-bold text-gray-900 uppercase">{t.cajaDestino.nombre}</p>
                   </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase">
                        {t.descripcion || "Transferencia Operativa"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                         <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-medium uppercase">
                            <Calendar size={12} />
                            {formatFecha(t.fecha)}
                         </div>
                         <span className="text-[10px] text-gray-300 font-bold uppercase">{t.formaPagoOrigen} <ArrowRight size={10} className="inline mx-0.5" /> {t.formaPagoDestino}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                       <p className="text-xl font-bold tabular-nums text-gray-900">
                          ${t.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                       </p>
                       <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Confirmado</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {transferencias.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
               <ArrowRightLeft size={48} className="text-gray-200 mx-auto mb-4" />
               <p className="text-gray-400 font-medium">No hay transferencias registradas</p>
            </div>
          )}
        </div>
      </main>

      <Drawer 
        isOpen={mostrarForm} 
        onClose={() => setMostrarForm(false)} 
        title="Nueva Transferencia"
      >
        <div className="p-1 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Caja Origen</label>
              <select 
                value={cajaOrigenId} 
                onChange={e => {
                  const newOrigen = e.target.value;
                  setCajaOrigenId(newOrigen);
                  if (newOrigen === cajaDestinoId) {
                    setCajaDestinoId(cajas.find(c => c.id !== newOrigen)?.id || "");
                  }
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer"
              >
                {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Caja Destino</label>
              <select 
                value={cajaDestinoId} onChange={e => setCajaDestinoId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none appearance-none cursor-pointer"
              >
                {cajas.filter((c) => c.id !== cajaOrigenId).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Monto a Transferir</label>
             <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input 
                  type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-lg font-bold outline-none transition-all placeholder:text-gray-200" 
                />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Descripción (Opcional)</label>
             <input 
               type="text" value={descripcion} onChange={e => setDescripcion(formatoService.capitalizarPrimeraLetra(e.target.value))}
               placeholder="Motivo de la transferencia..."
               className="w-full px-5 py-4 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-medium outline-none" 
             />
          </div>

          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Métodos de Pago</p>
             <div className="grid grid-cols-2 gap-4">
                <select value={formaPagoOrigen} onChange={e => setFormaPagoOrigen(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none uppercase appearance-none cursor-pointer">
                  {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={formaPagoDestino} onChange={e => setFormaPagoDestino(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none uppercase appearance-none cursor-pointer">
                  {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
             </div>
          </div>

          <div className="pt-6">
            <button
              onClick={guardar} disabled={guardando || !monto || cajaOrigenId === cajaDestinoId}
              className="w-full py-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all active:scale-[0.98] shadow-lg shadow-red-600/20"
            >
              {guardando ? "Procesando..." : "Confirmar Transferencia"}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default function TransferenciasPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Cargando modulo de transferencias...</div>}>
      <TransferenciasContent />
    </Suspense>
  );
}
