"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";
import {
  ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft,
  History, ArrowRightLeft, Tag, Plus, Trash2, X, Check
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { formatFecha } from "@/lib/dateUtils";
import { formatMoney } from "@/lib/constants";
import { useToast } from "@/context/ToastContext";

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

function parseCategoria(descripcion: string): { categoria: string | null; texto: string } {
  const match = descripcion.match(/^\[([^\]]+)\]\s*(.*)/);
  if (match) return { categoria: match[1], texto: match[2] };
  return { categoria: null, texto: descripcion };
}

export default function CajaDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { showToast } = useToast();
  const [caja, setCaja] = useState<CajaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<"ingreso" | "egreso">("ingreso");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [guardando, setGuardando] = useState(false);

  // Retenciones
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [mostrarGestionCat, setMostrarGestionCat] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [guardandoCat, setGuardandoCat] = useState(false);

  const esRetenciones = caja?.nombre?.toUpperCase() === "RETENCIONES";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch(`/api/cajas/${id}`)
      .then((r) => r.json())
      .then((data) => { setCaja(data); setLoading(false); })
      .catch(() => { showToast("Error al cargar la caja", "error"); setLoading(false); });
  };

  useEffect(() => { if (id) cargar(); }, [id]);
  useAutoRefresh(cargar);

  // Cargar categorías cuando sea caja Retenciones
  useEffect(() => {
    if (esRetenciones) {
      fetch("/api/retenciones/categorias")
        .then((r) => r.json())
        .then((data: string[]) => {
          setCategorias(data);
          if (data.length > 0) setCategoriaSeleccionada(data[0]);
        })
        .catch(() => {});
    }
  }, [esRetenciones]);

  const guardar = async () => {
    if (!descripcion || !importe) return;
    setGuardando(true);

    const descFinal = esRetenciones && categoriaSeleccionada
      ? `[${categoriaSeleccionada}] ${descripcion.toUpperCase()}`
      : descripcion.toUpperCase();

    await fetch(`/api/cajas/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoMovimiento, descripcion: descFinal, importe, formaPago }),
    });

    setMostrarForm(false);
    setDescripcion(""); setImporte("");
    setGuardando(false);
    cargar();
  };

  const guardarCategorias = async (lista: string[]) => {
    setGuardandoCat(true);
    try {
      const res = await fetch("/api/retenciones/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categorias: lista }),
      });
      if (res.ok) {
        const data: string[] = await res.json();
        setCategorias(data);
        if (!data.includes(categoriaSeleccionada)) setCategoriaSeleccionada(data[0] || "");
        showToast("Categorías guardadas", "success");
      } else {
        showToast("Error al guardar categorías", "error");
      }
    } finally {
      setGuardandoCat(false);
    }
  };

  const agregarCategoria = () => {
    const nueva = nuevaCategoria.trim().toUpperCase();
    if (!nueva || categorias.includes(nueva)) return;
    const lista = [...categorias, nueva];
    setNuevaCategoria("");
    guardarCategorias(lista);
  };

  const eliminarCategoria = (cat: string) => {
    if (categorias.length <= 1) { showToast("Debe quedar al menos una categoría", "error"); return; }
    guardarCategorias(categorias.filter((c) => c !== cat));
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
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Caja: {caja.nombre}
                {esRetenciones && (
                  <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    No afecta totales
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {esRetenciones && (
              <button
                onClick={() => setMostrarGestionCat(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
              >
                <Tag size={14} /> Categorías
              </button>
            )}
            <div className="bg-gray-50 px-5 py-2.5 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Saldo Actual</p>
              <p className={`text-xl font-bold tabular-nums ${caja.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                ${formatMoney(caja.saldo)}
              </p>
            </div>
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
            <button
              onClick={() => router.push(`/cajas/transferencias?origen=${caja.id}`)}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-gray-900/10"
            >
              <ArrowRightLeft size={18} className="hidden sm:block" /> <span className="hidden sm:inline">Transferir</span><ArrowRightLeft size={18} className="sm:hidden" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-gray-400 font-medium text-xs bg-white px-4 py-2.5 rounded-xl border border-gray-200">
            <History size={14} /> {caja.movimientos.length} movimientos registrados
          </div>
        </div>

        {/* Resumen por categoría (solo Retenciones) */}
        {esRetenciones && categorias.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3">Saldo por Categoría</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categorias.map((cat) => {
                const total = caja.movimientos.reduce((sum, m) => {
                  const parsed = parseCategoria(m.descripcion);
                  if (parsed.categoria === cat) return sum + m.ingreso - m.egreso;
                  return sum;
                }, 0);
                return (
                  <div key={cat} className="bg-white rounded-xl border border-amber-100 p-3">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">{cat}</p>
                    <p className={`text-lg font-bold tabular-nums ${total >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      ${formatMoney(total)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-4">
          {caja.movimientos.map((m) => {
            const isIngreso = m.ingreso > 0;
            const { categoria, texto } = parseCategoria(m.descripcion);
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
                      <div className="flex items-center gap-2 flex-wrap">
                        {categoria && (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {categoria}
                          </span>
                        )}
                        <p className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors uppercase">
                          {texto}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {formatFecha(m.fecha)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {m.formaPago}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-bold tabular-nums ${isIngreso ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isIngreso ? `+ $${formatMoney(m.ingreso)}` : `- $${formatMoney(m.egreso)}`}
                      </p>
                      <p className="text-[10px] font-medium text-gray-400 mt-1">Saldo: ${formatMoney(m.saldoAcum)}</p>
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

      {/* Drawer: Nuevo Movimiento */}
      <Drawer
        isOpen={mostrarForm}
        onClose={() => setMostrarForm(false)}
        title={tipoMovimiento === "ingreso" ? "Registrar Ingreso" : "Registrar Egreso"}
      >
        <div className="p-1 space-y-8">
          {/* Selector de categoría (solo Retenciones) */}
          {esRetenciones && categorias.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Categoría de Retención</label>
              <div className="flex flex-wrap gap-2">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaSeleccionada(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                      categoriaSeleccionada === cat
                        ? "bg-amber-500 text-white border-amber-500 shadow-md"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Concepto / Descripción</label>
            <textarea
              value={descripcion} onChange={e => setDescripcion(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-medium outline-none transition-all placeholder:text-gray-300 min-h-[100px] resize-none"
              placeholder="Ej: Retención factura #123"
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

      {/* Drawer: Gestión de Categorías */}
      <Drawer
        isOpen={mostrarGestionCat}
        onClose={() => setMostrarGestionCat(false)}
        title="Gestionar Categorías de Retenciones"
      >
        <div className="p-1 space-y-6">
          <p className="text-xs text-gray-400 font-medium">
            Estas categorías aparecen al registrar movimientos en la caja Retenciones.
          </p>

          {/* Lista actual */}
          <div className="space-y-2">
            {categorias.map((cat) => (
              <div key={cat} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">{cat}</span>
                <button
                  onClick={() => eliminarCategoria(cat)}
                  disabled={guardandoCat || categorias.length <= 1}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Agregar nueva */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nueva Categoría</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarCategoria()}
                placeholder="Ej: PERCEPCIONES"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 focus:border-amber-500 rounded-xl text-sm font-medium outline-none transition-all"
              />
              <button
                onClick={agregarCategoria}
                disabled={guardandoCat || !nuevaCategoria.trim()}
                className="flex items-center gap-1.5 px-4 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
              >
                <Plus size={16} /> Agregar
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setMostrarGestionCat(false)}
              className="w-full py-3 rounded-xl text-sm font-bold bg-gray-900 text-white hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} /> Listo
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
