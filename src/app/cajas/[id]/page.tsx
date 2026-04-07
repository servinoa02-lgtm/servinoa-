"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft, 
  History, Calendar, 
  CreditCard, Search, Filter
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";

interface Movimiento {
  id: string;
  fecha: string;
  descripcion: string;
  ingreso: number;
  egreso: number;
  formaPago: string;
  saldoAcum: number;
}

interface CajaDetalle {
  id: string;
  nombre: string;
  saldo: number;
  movimientos: Movimiento[];
}

const FORMAS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE", "TARJETA", "MERCADO PAGO", "OTRO"];

export default function CajaDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [caja, setCaja] = useState<CajaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<"ingreso" | "egreso">("ingreso");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch(`/api/cajas/${id}`)
      .then((r) => r.json())
      .then((data) => { setCaja(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (id) cargar(); }, [id]);

  const guardar = async () => {
    if (!descripcion || !importe) return;
    setGuardando(true);

    await fetch(`/api/cajas/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoMovimiento, descripcion: descripcion.toUpperCase(), importe, formaPago }),
    });

    setMostrarForm(false);
    setDescripcion(""); setImporte("");
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando detalles de caja...</div>
    </div>
  );

  if (!caja) return <div className="p-40 text-center font-bold text-red-600 uppercase">Caja no encontrada</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/cajas" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Control de Tesorería</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Caja: {caja.nombre}</h1>
            </div>
          </div>
          
          <div className="bg-gray-50 px-5 py-2.5 rounded-xl border border-gray-200">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Saldo Actual</p>
            <p className={`text-xl font-bold tabular-nums ${caja.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              ${caja.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full space-y-8">
        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
           <div className="flex gap-3">
              <button
                onClick={() => { setTipoMovimiento("ingreso"); setMostrarForm(true); }}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
              >
                <ArrowDownLeft size={18} /> Nuevo Ingreso
              </button>
              <button
                onClick={() => { setTipoMovimiento("egreso"); setMostrarForm(true); }}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10"
              >
                <ArrowUpRight size={18} /> Nuevo Egreso
              </button>
           </div>
           
           <div className="hidden md:flex items-center gap-2 text-gray-400 font-medium text-xs bg-white px-4 py-2.5 rounded-xl border border-gray-200">
              <History size={14} /> {caja.movimientos.length} movimientos registrados
           </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {caja.movimientos.map((m, idx) => {
            const isIngreso = m.ingreso > 0;
            return (
              <div 
                key={m.id} 
                className="group bg-white p-5 rounded-2xl border border-gray-200 flex items-center gap-6 hover:shadow-md transition-all"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isIngreso ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {isIngreso ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase">
                        {m.descripcion}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                         <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            {new Date(m.fecha).toLocaleDateString("es-AR")}
                         </span>
                         <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {m.formaPago}
                         </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                       <p className={`text-lg font-bold tabular-nums ${isIngreso ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isIngreso ? `+ $${m.ingreso.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : `- $${m.egreso.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`}
                       </p>
                       <p className="text-[10px] font-medium text-gray-400 mt-1">Saldo: ${m.saldoAcum.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {caja.movimientos.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
               <Wallet size={48} className="text-gray-200 mx-auto mb-4" />
               <p className="text-gray-400 font-medium">No hay movimientos registrados</p>
            </div>
          )}
        </div>
      </main>

      <Drawer 
        isOpen={mostrarForm} 
        onClose={() => setMostrarForm(false)} 
        title={tipoMovimiento === "ingreso" ? "Registrar Ingreso" : "Registrar Egreso"}
      >
        <div className="p-1 space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Concepto / Descripción</label>
            <textarea 
              value={descripcion} onChange={e => setDescripcion(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-medium outline-none transition-all placeholder:text-gray-300 min-h-[100px] resize-none" 
              placeholder="Ej: Cobro de reparación OT #123" 
            />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Importe</label>
             <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input 
                  type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-lg font-bold outline-none transition-all placeholder:text-gray-200" 
                />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Método de Pago</label>
             <select 
               value={formaPago} onChange={e => setFormaPago(e.target.value)}
               className="w-full px-5 py-4 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none transition-all appearance-none cursor-pointer"
             >
               {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
             </select>
          </div>

          <div className="pt-6">
            <button
              onClick={guardar} disabled={guardando || !descripcion || !importe}
              className={`w-full py-4 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${tipoMovimiento === "ingreso" ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" : "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"}`}
            >
              {guardando ? "Procesando..." : "Confirmar Movimiento"}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
