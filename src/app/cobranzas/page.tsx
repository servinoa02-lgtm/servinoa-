"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Cobranza {
  id: string;
  tipo: string;
  fecha: string;
  descripcion?: string | null;
  importe: number;
  formaPago: string;
  montoPresupuesto?: number | null;
  saldo?: number | null;
  cliente?: { nombre: string; empresa?: { nombre: string } | null } | null;
  presupuesto?: { numero: number; orden?: { numero: number } | null } | null;
  caja?: { nombre: string } | null;
}

interface Cliente { id: string; nombre: string; empresa?: { nombre: string } | null; }
interface Presupuesto { id: string; numero: number; total: number; cobrado: number; saldo: number; fecha: string; }
interface Caja { id: string; nombre: string; }

const FORMAS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Mercado Pago", "Otro"];

function CobranzasContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pptoIdParam = searchParams.get("presupuestoId");

  const [cobranzas, setCobranzas] = useState<Cobranza[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  // Form state
  const [tipo, setTipo] = useState<"PRESUPUESTO" | "COBRANZA_VARIA">("PRESUPUESTO");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [presupuestoId, setPresupuestoId] = useState(pptoIdParam || "");
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaId, setCajaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [importe, setImporte] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo");
  
  // Datos Cheque
  const [chequeNumero, setChequeNumero] = useState("");
  const [chequeBanco, setChequeBanco] = useState("");
  const [chequeFechaEmision, setChequeFechaEmision] = useState("");
  const [chequeFechaCobro, setChequeFechaCobro] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [pptoCargando, setPptoCargando] = useState(false);
  const [pptoInfo, setPptoInfo] = useState<Presupuesto | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/cobranzas").then((r) => r.json()).then((d) => { setCobranzas(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
    fetch("/api/cajas").then((r) => r.json()).then((d) => {
      setCajas(d);
      if (d.length > 0) setCajaId(d[0].id);
    });
  }, []);

  useEffect(() => {
    if (pptoIdParam) {
      setMostrarForm(true);
      setTipo("PRESUPUESTO");
      setPptoInfo(null);
      fetch(`/api/presupuestos/${pptoIdParam}`)
        .then((r) => r.json())
        .then((d) => {
          setPptoInfo(d);
          setPresupuestoId(pptoIdParam);
          setClienteId(d.clienteId || "");
          setImporte(d.saldo?.toString() || "");
        });
    }
  }, [pptoIdParam]);

  useEffect(() => {
    if (clienteId && tipo === "PRESUPUESTO") {
      setPptoCargando(true);
      fetch("/api/presupuestos")
        .then((r) => r.json())
        .then((d) => {
          const del_cliente = d.filter((p: Presupuesto & { clienteId?: string; estado?: string }) => p.clienteId === clienteId && p.estado === "APROBADO" && p.saldo > 0);
          setPresupuestos(del_cliente);
          setPptoCargando(false);
        })
        .catch(() => setPptoCargando(false));
    }
  }, [clienteId, tipo]);

  const eliminarCobranza = async (id: string) => {
    setEliminando(true);
    await fetch(`/api/cobranzas/${id}`, { method: "DELETE" });
    setEliminando(false);
    setConfirmDelete(null);
    cargar();
  };

  const guardar = async () => {
    if (!cajaId || !importe) return;
    if (tipo === "PRESUPUESTO" && !presupuestoId) return;
    setGuardando(true);

    await fetch("/api/cobranzas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        clienteId: clienteId || null,
        presupuestoId: tipo === "PRESUPUESTO" ? presupuestoId : null,
        descripcion: descripcion || null,
        importe,
        formaPago,
        cajaId,
        usuarioId: (session?.user as { id?: string })?.id,
        ...(formaPago === "Cheque" && { chequeNumero, chequeBanco, chequeFechaEmision, chequeFechaCobro })
      }),
    });

    setMostrarForm(false);
    setImporte(""); setDescripcion(""); setPresupuestoId(""); setClienteId("");
    setChequeNumero(""); setChequeBanco(""); setChequeFechaEmision(""); setChequeFechaCobro("");
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Menú</button>
          <h1 className="text-xl font-bold text-gray-900">Cobranzas</h1>
        </div>
        <button
          onClick={() => { setMostrarForm(true); setTipo("PRESUPUESTO"); }}
          className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600"
        >
          + Nueva Cobranza
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción / Ppto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Monto Ppto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cobrado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Forma de pago</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Caja</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cobranzas.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                  <td className="px-4 py-3">
                    {c.cliente?.empresa?.nombre
                      ? `${c.cliente.empresa.nombre} - ${c.cliente.nombre}`
                      : c.cliente?.nombre || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.presupuesto
                      ? `Ppto ${new Date(cobranzas[0]?.fecha || "").getFullYear()}-${c.presupuesto.numero.toString().padStart(5, "0")}${c.presupuesto.orden ? ` / OT-${c.presupuesto.orden.numero}` : ""}`
                      : c.descripcion || "Cobro varios"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {c.montoPresupuesto != null ? `$${c.montoPresupuesto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">
                    ${c.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.formaPago}</td>
                  <td className="px-4 py-3 text-gray-500">{c.caja?.nombre || "-"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setConfirmDelete(c.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {cobranzas.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay cobranzas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Panel lateral nueva cobranza */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMostrarForm(false)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Nueva Cobranza</h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                <div className="flex gap-2">
                  {(["PRESUPUESTO", "COBRANZA_VARIA"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${tipo === t ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500"}`}
                    >
                      {t === "PRESUPUESTO" ? "Presupuesto" : "Cobros Varios"}
                    </button>
                  ))}
                </div>
              </div>

              {tipo === "PRESUPUESTO" ? (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Cliente</label>
                    <select value={clienteId} onChange={(e) => { setClienteId(e.target.value); setPresupuestoId(""); setPptoInfo(null); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} - ${c.nombre}` : c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {clienteId && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Presupuesto (aprobados con saldo)</label>
                      {pptoCargando ? <p className="text-xs text-gray-400">Cargando...</p> : (
                        <select value={presupuestoId} onChange={(e) => {
                          setPresupuestoId(e.target.value);
                          const p = presupuestos.find((x) => x.id === e.target.value);
                          setPptoInfo(p || null);
                          if (p) setImporte(p.saldo.toString());
                        }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                          <option value="">Seleccionar presupuesto...</option>
                          {presupuestos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {new Date(p.fecha).getFullYear()}-{p.numero.toString().padStart(5, "0")} — Saldo: ${p.saldo.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                            </option>
                          ))}
                        </select>
                      )}
                      {presupuestos.length === 0 && !pptoCargando && clienteId && (
                        <p className="text-xs text-orange-600 mt-1">No hay presupuestos aprobados con saldo pendiente</p>
                      )}
                    </div>
                  )}

                  {pptoInfo && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total presupuesto</span>
                        <span className="font-medium">${pptoInfo.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ya cobrado</span>
                        <span className="font-medium text-green-700">${pptoInfo.cobrado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Saldo pendiente</span>
                        <span className="text-red-600">${pptoInfo.saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Cliente (opcional)</label>
                    <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                      <option value="">Sin cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} - ${c.nombre}` : c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Descripción *</label>
                    <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Descripción del cobro..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-gray-500 block mb-1">Importe a cobrar *</label>
                <input type="number" min="0" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Forma de pago</label>
                <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>

              {formaPago === "Cheque" && (
                <div className="grid grid-cols-2 gap-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
                   <div className="col-span-2">
                     <label className="text-xs font-semibold text-amber-800 block mb-1">Datos del Cheque</label>
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-bold text-amber-700 block mb-1">N° Cheque *</label>
                     <input type="text" value={chequeNumero} onChange={e => setChequeNumero(e.target.value)} className="w-full px-2 py-1.5 border border-amber-300 rounded text-sm"/>
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-bold text-amber-700 block mb-1">Banco *</label>
                     <input type="text" value={chequeBanco} onChange={e => setChequeBanco(e.target.value)} className="w-full px-2 py-1.5 border border-amber-300 rounded text-sm"/>
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-bold text-amber-700 block mb-1">Emisión</label>
                     <input type="date" value={chequeFechaEmision} onChange={e => setChequeFechaEmision(e.target.value)} className="w-full px-2 py-1.5 border border-amber-300 rounded text-sm"/>
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-bold text-amber-700 block mb-1">Vencimiento (Cobro) *</label>
                     <input type="date" value={chequeFechaCobro} onChange={e => setChequeFechaCobro(e.target.value)} className="w-full px-2 py-1.5 border border-amber-300 rounded text-sm"/>
                   </div>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 block mb-1">Caja destino *</label>
                <select value={cajaId} onChange={(e) => setCajaId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="">Seleccionar caja...</option>
                  {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={guardar}
                disabled={guardando || !importe || !cajaId || (tipo === "PRESUPUESTO" ? !presupuestoId : !descripcion)}
                className="w-full bg-amber-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Registrar Cobranza"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar cobranza"
        message="¿Estás seguro? Esta acción revertirá el cobro y no se puede deshacer."
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && eliminarCobranza(confirmDelete)}
      />
    </div>
  );
}

export default function CobranzasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>}>
      <CobranzasContent />
    </Suspense>
  );
}
