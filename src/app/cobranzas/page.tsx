"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Search, Receipt, X, Save } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatFecha, hoyISO } from "@/lib/dateUtils";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { formatoService } from "@/services/formatoService";
import { formatMoney } from "@/lib/constants";
import { useDebounce } from "@/hooks/useDebounce";

interface Cobranza {
  id: string; tipo: string; fecha: string; descripcion?: string | null;
  importe: number; formaPago: string;
  cliente?: { nombre: string; empresa?: { nombre: string } | null } | null;
  presupuesto?: { numero: number; cliente?: { nombre: string; empresa?: { nombre: string } | null } | null } | null;
  caja?: { nombre: string } | null;
}
interface Cliente { id: string; nombre: string; empresa?: { nombre: string } | null; }
interface Presupuesto { id: string; numero: number; total: number; cobrado: number; saldo: number; clienteId?: string; estado?: string; }
interface Caja { id: string; nombre: string; }

const FORMAS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Mercado Pago", "Otro"];

function CobranzasContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pptoIdParam = searchParams.get("presupuestoId");

  const [cobranzas, setCobranzas] = useState<Cobranza[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(!!pptoIdParam);
  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda] = useDebounce(busqueda, 500);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Form
  const [tipo, setTipo] = useState<"PRESUPUESTO" | "COBRANZA_VARIA">("PRESUPUESTO");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoId, setPresupuestoId] = useState(pptoIdParam || "");
  const [pptoInfo, setPptoInfo] = useState<Presupuesto | null>(null);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaId, setCajaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [fecha, setFecha] = useState(hoyISO());
  // Cheque
  const [chequeNumero, setChequeNumero] = useState("");
  const [chequeBanco, setChequeBanco] = useState("");
  const [chequeFechaEmision, setChequeFechaEmision] = useState("");
  const [chequeFechaCobro, setChequeFechaCobro] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargarCobranzas = useCallback(async () => {
    try {
      const res = await fetch(`/api/cobranzas?page=${page}&limit=20&search=${encodeURIComponent(debouncedBusqueda)}`);
      const data = await res.json();
      setCobranzas(data.data);
      setTotalPages(data.totalPages);
      setTotalCount(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedBusqueda]);

  const cargarAuxiliares = useCallback(async () => {
    const [cl, ca] = await Promise.all([
      fetch("/api/clientes?limit=1000").then(r => r.json()),
      fetch("/api/cajas").then(r => r.json()),
    ]);
    setClientes(cl.data || cl);
    setCajas(ca);
    if (ca.length > 0) setCajaId(ca[0].id);
  }, []);

  useEffect(() => {
    if (status === "authenticated") cargarCobranzas();
  }, [status, cargarCobranzas]);

  useEffect(() => {
    if (status === "authenticated") cargarAuxiliares();
  }, [status, cargarAuxiliares]);

  useEffect(() => { setPage(1); }, [debouncedBusqueda]);

  // Pre-cargar presupuesto si viene por URL
  useEffect(() => {
    if (pptoIdParam && status === "authenticated") {
      fetch(`/api/presupuestos/${pptoIdParam}`)
        .then(r => {
          if (!r.ok) throw new Error("Error al cargar presupuesto");
          return r.json();
        })
        .then(d => {
          if (d.error) throw new Error(d.error);
          setPptoInfo(d);
          setPresupuestoId(pptoIdParam);
          setClienteId(d.cliente?.id || "");
          setImporte(d.saldo?.toString() || "");
          setMostrarForm(true);
        })
        .catch(e => {
          console.error(e);
          setErrorForm("No se pudo cargar la información del presupuesto (" + pptoIdParam + ")");
        });
    }
  }, [pptoIdParam, status]);

  // Cargar presupuestos del cliente seleccionado
  useEffect(() => {
    if (clienteId && tipo === "PRESUPUESTO") {
      fetch("/api/presupuestos").then(r => r.json()).then((d: any) => {
        const list = Array.isArray(d) ? d : (d.data || []);
        setPresupuestos(list.filter((p: any) => p.clienteId === clienteId && p.estado === "APROBADO" && p.saldo > 0));
      });
    }
  }, [clienteId, tipo]);

  const resetForm = () => {
    setTipo("PRESUPUESTO"); setClienteId(""); setPresupuestoId(""); setPptoInfo(null);
    setImporte(""); setDescripcion(""); setFormaPago("Efectivo");
    setFecha(hoyISO());
    setChequeNumero(""); setChequeBanco(""); setChequeFechaEmision(""); setChequeFechaCobro("");
    setErrorForm("");
  };

  const guardar = async () => {
    if (!cajaId || !importe) { setErrorForm("Importe y caja son obligatorios"); return; }
    if (tipo === "PRESUPUESTO" && !presupuestoId) { setErrorForm("Seleccioná un presupuesto"); return; }
    if (tipo === "COBRANZA_VARIA" && !descripcion) { setErrorForm("Ingresá una descripción"); return; }
    setGuardando(true);
    setErrorForm("");

    const res = await fetch("/api/cobranzas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        clienteId: clienteId || null,
        presupuestoId: tipo === "PRESUPUESTO" ? presupuestoId : null,
        descripcion: formatoService.capitalizarPrimeraLetra(descripcion || "Cobro varios"),
        importe: parseFloat(importe),
        formaPago,
        cajaId,
        usuarioId: (session?.user as any)?.id,
        fecha,
        ...(formaPago === "Cheque" && {
          chequeNumero: formatoService.capitalizarPalabras(chequeNumero), chequeBanco: formatoService.capitalizarPalabras(chequeBanco), chequeFechaEmision, chequeFechaCobro,
        }),
      }),
    });

    if (res.ok) {
      setMostrarForm(false);
      resetForm();
      await cargarCobranzas();
      if (pptoIdParam) router.push("/cobranzas");
    } else {
      setErrorForm("Error al registrar el cobro");
    }
    setGuardando(false);
  };

  const eliminar = async (id: string) => {
    setEliminando(true);
    await fetch(`/api/cobranzas/${id}`, { method: "DELETE" });
    setEliminando(false);
    setConfirmDelete(null);
    cargarCobranzas();
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center p-40">
        <div className="text-gray-400 font-bold text-sm animate-pulse uppercase tracking-widest">Cargando cobros...</div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN", "JEFE", "ADMINISTRACION"]}>
      <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/finanzas" className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Tesorería</p>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Cobros</h1>
            </div>
          </div>
          <button onClick={() => { resetForm(); setMostrarForm(true); }}
                  className="bg-red-600 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-1.5 md:gap-2">
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo</span> cobro
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">

        {/* Formulario inline */}
        {mostrarForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 uppercase">Registrar cobro</h2>
              <button onClick={() => { setMostrarForm(false); resetForm(); if (pptoIdParam) router.push("/cobranzas"); }}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 space-y-6">

              {errorForm && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                  <span>{errorForm}</span>
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Tipo</label>
                <div className="flex gap-2">
                  {(["PRESUPUESTO", "COBRANZA_VARIA"] as const).map(t => (
                    <button key={t} type="button"
                            onClick={() => { setTipo(t); setPresupuestoId(""); setPptoInfo(null); }}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${tipo === t ? "bg-red-600 text-white border-red-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                      {t === "PRESUPUESTO" ? "Presupuesto" : "Cobro vario"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cliente */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Cliente</label>
                  <select value={clienteId}
                          onChange={e => { setClienteId(e.target.value); setPresupuestoId(""); setPptoInfo(null); }}
                          disabled={!!pptoIdParam}
                          className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all disabled:opacity-60">
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} — ${c.nombre}` : c.nombre}</option>)}
                  </select>
                </div>

                {/* Presupuesto (si tipo = PRESUPUESTO) */}
                {tipo === "PRESUPUESTO" ? (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Presupuesto</label>
                    {pptoIdParam && pptoInfo ? (
                      <div className="px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-700 uppercase">
                        Ppto #{pptoInfo.numero} — Saldo: ${formatMoney(pptoInfo.saldo, 0)}
                      </div>
                    ) : (
                      <select value={presupuestoId}
                              onChange={e => {
                                setPresupuestoId(e.target.value);
                                const p = presupuestos.find(x => x.id === e.target.value);
                                setPptoInfo(p || null);
                                if (p) setImporte(p.saldo.toString());
                              }}
                              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all">
                        <option value="">Seleccionar presupuesto...</option>
                        {presupuestos.map(p => <option key={p.id} value={p.id}>Ppto #{p.numero} — Saldo: ${formatMoney(p.saldo, 0)}</option>)}
                      </select>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Descripción *</label>
                    <input type="text" value={descripcion} onChange={e => setDescripcion(formatoService.capitalizarPrimeraLetra(e.target.value))}
                           placeholder="Motivo del cobro..."
                           className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>
                )}

                {/* Info saldo */}
                {pptoInfo && (
                  <div className="md:col-span-2 grid grid-cols-3 gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total ppto</p>
                      <p className="text-sm font-bold text-gray-900">${formatMoney(pptoInfo.total, 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ya cobrado</p>
                      <p className="text-sm font-bold text-emerald-600">${formatMoney(pptoInfo.cobrado, 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Saldo pendiente</p>
                      <p className="text-sm font-bold text-red-600">${formatMoney(pptoInfo.saldo, 0)}</p>
                    </div>
                  </div>
                )}

                {/* Importe */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Importe *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">$</span>
                    <input type="number" min="0" step="0.01" value={importe} onChange={e => setImporte(e.target.value)}
                           placeholder="0.00"
                           className="w-full pl-8 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Fecha</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                         className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                </div>

                {/* Forma de pago */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Forma de pago</label>
                  <select value={formaPago} onChange={e => setFormaPago(e.target.value)}
                          className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all">
                    {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Caja destino */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Caja destino *</label>
                  <select value={cajaId} onChange={e => setCajaId(e.target.value)}
                          className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all">
                    {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                {/* Datos cheque */}
                {formaPago === "Cheque" && (
                  <div className="md:col-span-2 grid grid-cols-2 gap-4 p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                    <p className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos del cheque</p>
                    <input type="text" placeholder="N° de cheque" value={chequeNumero} onChange={e => setChequeNumero(formatoService.capitalizarPalabras(e.target.value))}
                           className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-red-600" />
                    <input type="text" placeholder="Banco emisor" value={chequeBanco} onChange={e => setChequeBanco(formatoService.capitalizarPalabras(e.target.value))}
                           className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-red-600" />
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fecha emisión</label>
                      <input type="date" value={chequeFechaEmision} onChange={e => setChequeFechaEmision(e.target.value)}
                             className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-red-600" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fecha cobro</label>
                      <input type="date" value={chequeFechaCobro} onChange={e => setChequeFechaCobro(e.target.value)}
                             className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-red-600" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={guardar} disabled={guardando}
                        className="bg-red-600 text-white px-10 py-3.5 rounded-2xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-2">
                  <Save size={16} /> {guardando ? "Guardando..." : "Confirmar cobro"}
                </button>
                <button onClick={() => { setMostrarForm(false); resetForm(); if (pptoIdParam) router.push("/cobranzas"); }}
                        className="text-gray-400 hover:text-gray-700 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Búsqueda */}
        {!mostrarForm && (
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <Search className="text-gray-400 shrink-0" size={18} />
            <input type="text" placeholder="Buscar por cliente, empresa o n° de presupuesto..."
                   value={busqueda} onChange={e => setBusqueda(e.target.value)}
                   className="flex-1 text-sm font-medium outline-none bg-transparent" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">{totalCount} registros</span>
          </div>
        )}

        {/* Lista */}
        {!mostrarForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {cobranzas.length === 0 && (
                <div className="py-20 text-center">
                  <Receipt size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No hay cobros registrados</p>
                </div>
              )}
              {cobranzas.map(c => (
                <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Receipt size={16} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const cl = c.cliente || c.presupuesto?.cliente;
                      const empresaNombre = cl?.empresa?.nombre;
                      const clienteNombre = cl?.nombre;
                      const mainTitle = empresaNombre || clienteNombre || c.descripcion || "Cobro vario";
                      const infoText = c.presupuesto
                        ? `Ppto #${c.presupuesto.numero}`
                        : (cl ? c.descripcion : null);
                      return (
                        <>
                          <p className="text-sm font-bold text-gray-900 uppercase truncate">{mainTitle}</p>
                          {empresaNombre && clienteNombre && (
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{clienteNombre}</p>
                          )}
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-gray-400 font-bold">{formatFecha(c.fecha)}</span>
                            {infoText && <span className="text-[10px] text-gray-500 font-bold">{infoText}</span>}
                            {c.caja && <span className="text-[10px] font-bold text-emerald-600">Caja: {c.caja.nombre}</span>}
                            <span className="text-[10px] text-gray-400">{c.formaPago}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-base font-bold text-emerald-600 tabular-nums shrink-0">
                    +${formatMoney(c.importe, 0)}
                  </p>
                  <button onClick={() => setConfirmDelete(c.id)}
                          className="p-2 text-gray-200 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paginación */}
        {!mostrarForm && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 hover:border-red-600 hover:text-red-600 transition-all disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400">
              Anterior
            </button>
            <div className="text-sm text-gray-500 font-medium">
              Página <span className="font-bold text-gray-900">{page}</span> de <span className="font-bold text-gray-900">{totalPages}</span>
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 text-sm font-bold rounded-xl border border-gray-200 hover:border-red-600 hover:text-red-600 transition-all disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400">
              Siguiente
            </button>
          </div>
        )}
      </main>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Anular cobro"
        message="¿Eliminar este cobro? La caja y el estado del presupuesto se actualizarán."
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && eliminar(confirmDelete)}
      />
    </div>
    </RoleGuard>
  );
}

export default function CobranzasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-40 text-gray-400 font-bold animate-pulse">Cargando...</div>}>
      <CobranzasContent />
    </Suspense>
  );
}
