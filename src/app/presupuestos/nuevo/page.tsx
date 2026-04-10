"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArrowLeft, Plus, Trash2, Save, User, Wrench, CreditCard, ChevronRight, FileText, Receipt, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatoService } from "@/services/formatoService";

interface Cliente {
  id: string;
  nombre: string;
  empresa?: { nombre: string } | null;
  iva?: string;
}

interface Orden {
  id: string;
  numero: number;
  estado: string;
  cliente: { id: string; nombre: string; empresa?: { nombre: string } | null };
  maquina?: { nombre: string } | null;
  marca?: { nombre: string } | null;
  modelo?: { nombre: string } | null;
}

interface Item {
  cantidad: number;
  descripcion: string;
  precio: number;
}

function NuevoPresupuestoForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const otIdParam = searchParams.get("otId");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ordenFijada, setOrdenFijada] = useState<Orden | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [ordenId, setOrdenId] = useState(otIdParam || "");
  const [items, setItems] = useState<Item[]>([{ cantidad: 1, descripcion: "", precio: 0 }]);
  const [observaciones, setObservaciones] = useState("");
  const [incluyeIva, setIncluyeIva] = useState(false);
  const [formaPago, setFormaPago] = useState("Contado");
  const [validezDias, setValidezDias] = useState(7);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Nuevo Cliente
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoEmpresa, setNuevoEmpresa] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
    fetch("/api/ordenes").then((r) => r.json()).then(setOrdenes);
  }, []);

  useEffect(() => {
    if (otIdParam) {
      fetch(`/api/ordenes/${otIdParam}`)
        .then((r) => r.json())
        .then((data) => {
          setOrdenFijada(data);
          setClienteId(data.cliente?.id || "");
          setOrdenId(data.id);
        });
    }
  }, [otIdParam]);

  const ordenesFiltradas = clienteId && !otIdParam
    ? ordenes.filter(o => o.cliente.id === clienteId)
    : [];

  const subtotal = items.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  const iva = incluyeIva ? subtotal * 0.21 : 0;
  const total = subtotal + iva;

  const agregarItem = () => setItems([...items, { cantidad: 1, descripcion: "", precio: 0 }]);
  const eliminarItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };

  const actualizarItem = (idx: number, campo: keyof Item, valor: string | number) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [campo]: campo === "descripcion" ? formatoService.capitalizarPrimeraLetra(valor as string) : parseFloat(valor as string) || 0 };
    setItems(nuevos);
  };

  const handleCrearCliente = async () => {
    if (!nuevoNombre) return;
    setCreandoCliente(true);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: formatoService.capitalizarPalabras(nuevoNombre),
        telefono: nuevoTelefono || null,
        empresaNombre: nuevoEmpresa.trim() ? formatoService.capitalizarPalabras(nuevoEmpresa) : null,
        dni: null,
      }),
    });
    if (res.ok) {
      const cliente = await res.json();
      setClientes((prev) => [...prev, cliente]);
      setClienteId(cliente.id);
      setMostrarNuevoCliente(false);
      setNuevoNombre(""); setNuevoTelefono(""); setNuevoEmpresa("");
    }
    setCreandoCliente(false);
  };

  const guardar = async () => {
    if (!clienteId) { setError("Seleccioná un cliente para continuar"); return; }
    if (items.some((i) => !i.descripcion)) { setError("Todos los ítems deben tener descripción"); return; }
    setGuardando(true);
    setError("");

    const res = await fetch("/api/presupuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        ordenId: ordenId || null,
        usuarioId: (session?.user as { id?: string })?.id,
        items, observaciones, incluyeIva, formaPago, validezDias, moneda: "ARS",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/presupuestos/${data.id}`);
    } else {
      setError("Error al guardar el presupuesto");
      setGuardando(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-bold animate-pulse">
        Cargando...
      </div>
    );
  }

  const clienteSeleccionado = clientes.find(c => c.id === clienteId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </button>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Ventas</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nuevo Presupuesto</h1>
            </div>
          </div>
          <button onClick={guardar} disabled={guardando}
                  className="bg-red-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20 uppercase tracking-wide flex items-center gap-2 active:scale-95">
            <Save size={18} /> {guardando ? "Guardando..." : "Guardar presupuesto"}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 lg:px-10 py-10 w-full space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3">
            <AlertTriangle size={18} /> {error}
            <button onClick={() => setError("")} className="ml-auto text-[10px] underline">Cerrar</button>
          </div>
        )}

        {/* OT fijada por URL */}
        {ordenFijada && (
          <div className="bg-white border border-gray-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 font-bold text-xs">OT</div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Vinculado a Orden de Trabajo</p>
              <p className="text-sm font-bold text-gray-900 uppercase">
                #{ordenFijada.numero} — {[ordenFijada.maquina?.nombre, ordenFijada.marca?.nombre, ordenFijada.modelo?.nombre].filter(Boolean).join(" - ")}
              </p>
            </div>
          </div>
        )}

        {/* CLIENTE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-3">
              <User size={16} className="text-red-600" /> Cliente
            </h2>
            {!ordenFijada && (
              <button type="button" onClick={() => setMostrarNuevoCliente(!mostrarNuevoCliente)}
                      className="text-xs font-bold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-all flex items-center gap-2">
                <Plus size={14} /> {mostrarNuevoCliente ? "Seleccionar existente" : "Nuevo cliente"}
              </button>
            )}
          </div>
          <div className="p-8">
            {ordenFijada ? (
              <div className="px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl">
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-1">Cliente de la OT</p>
                <p className="text-lg font-bold text-gray-900 uppercase">
                  {ordenFijada.cliente?.empresa?.nombre ? `${ordenFijada.cliente.empresa.nombre} — ${ordenFijada.cliente.nombre}` : ordenFijada.cliente?.nombre}
                </p>
              </div>
            ) : !mostrarNuevoCliente ? (
              <div>
                <select value={clienteId} onChange={(e) => {
                  const id = e.target.value;
                  setClienteId(id);
                  setOrdenId("");
                  const c = clientes.find(cl => cl.id === id);
                  if (c) setIncluyeIva(c.iva === "Incluyen IVA");
                }}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 focus:border-red-600 rounded-2xl text-sm font-bold outline-none transition-all">
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.empresa ? `${c.empresa.nombre} — ${c.nombre}` : c.nombre}
                    </option>
                  ))}
                </select>

                {/* OT vinculada (opcional, filtrada por cliente) */}
                {clienteId && ordenesFiltradas.length > 0 && (
                  <div className="mt-5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">OT vinculada (opcional)</label>
                    <select value={ordenId} onChange={(e) => setOrdenId(e.target.value)}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 focus:border-red-600 rounded-2xl text-sm font-bold outline-none transition-all">
                      <option value="">Sin OT vinculada (venta directa)</option>
                      {ordenesFiltradas.map((o) => (
                        <option key={o.id} value={o.id}>
                          OT #{o.numero}{o.maquina ? ` — ${o.maquina.nombre}` : ""}{o.marca ? ` ${o.marca.nombre}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {clienteId && ordenesFiltradas.length === 0 && (
                  <p className="mt-3 text-xs text-gray-400 italic">Este cliente no tiene órdenes de trabajo activas. El presupuesto se crea como venta directa.</p>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Nombre *</label>
                    <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(formatoService.capitalizarPalabras(e.target.value))}
                           className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Teléfono</label>
                    <input type="text" value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)}
                           className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Empresa (opcional)</label>
                    <input type="text" value={nuevoEmpresa} onChange={(e) => setNuevoEmpresa(formatoService.capitalizarPalabras(e.target.value))} placeholder="Particular"
                           className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>
                </div>
                <button onClick={handleCrearCliente} disabled={!nuevoNombre || creandoCliente}
                        className="bg-red-600 text-white px-8 py-3.5 rounded-2xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 uppercase tracking-wide">
                  {creandoCliente ? "Creando..." : "Crear y seleccionar cliente"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ÍTEMS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-3">
              <FileText size={16} className="text-red-600" /> Ítems del presupuesto
            </h2>
            <button onClick={agregarItem}
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-all uppercase tracking-wide flex items-center gap-2">
              <Plus size={16} /> Agregar ítem
            </button>
          </div>

          <div className="p-8">
            <div className="hidden lg:grid grid-cols-12 gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-4">
              <div className="col-span-1">Cant.</div>
              <div className="col-span-6">Descripción</div>
              <div className="col-span-2 text-right">Precio unit.</div>
              <div className="col-span-2 text-right">Subtotal</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-red-200 transition-all">
                  <input type="number" min="1" value={item.cantidad} onChange={(e) => actualizarItem(idx, "cantidad", e.target.value)}
                         className="col-span-1 px-3 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-center outline-none focus:border-red-600 transition-all" />
                  <input type="text" value={item.descripcion} onChange={(e) => actualizarItem(idx, "descripcion", e.target.value)}
                         placeholder="Descripción del trabajo o repuesto..."
                         className="col-span-6 px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  <input type="number" min="0" step="0.01" value={item.precio || ""} onChange={(e) => actualizarItem(idx, "precio", e.target.value)}
                         placeholder="0.00"
                         className="col-span-2 px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-right outline-none focus:border-red-600 transition-all font-mono" />
                  <div className="col-span-2 text-right text-sm font-bold text-red-600 pr-2">
                    ${(item.cantidad * item.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </div>
                  <button onClick={() => eliminarItem(idx)} disabled={items.length === 1}
                          className="col-span-1 flex justify-center text-gray-300 hover:text-red-600 transition-colors disabled:opacity-0">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="mt-8 bg-gray-50 border border-gray-100 rounded-2xl p-6 max-w-sm ml-auto space-y-3">
              <div className="flex justify-between text-sm font-bold text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={`flex justify-between text-sm font-bold border-b border-gray-200 pb-3 ${incluyeIva ? "text-gray-700" : "text-gray-300"}`}>
                <span>IVA {incluyeIva ? "(21%)" : "(no aplicado)"}</span>
                <span>${iva.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-bold text-gray-900 uppercase">Total</span>
                <span className="text-2xl font-bold text-gray-900">${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONDICIONES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-3">
            <CreditCard size={16} className="text-red-600" /> Condiciones comerciales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">IVA</label>
              <select value={incluyeIva ? "si" : "no"} onChange={(e) => setIncluyeIva(e.target.value === "si")}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-red-600 rounded-2xl text-sm font-bold outline-none transition-all">
                <option value="no">Sin IVA</option>
                <option value="si">Con IVA (21%)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Forma de pago</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-red-600 rounded-2xl text-sm font-bold outline-none transition-all">
                <option>Contado</option>
                <option>Transferencia</option>
                <option>Cheque 30 días</option>
                <option>Cheque 60 días</option>
                <option>Mercado Pago</option>
                <option>Cuenta corriente</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Validez (días)</label>
              <input type="number" value={validezDias} onChange={(e) => setValidezDias(parseInt(e.target.value) || 7)}
                     className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-red-600 rounded-2xl text-sm font-bold outline-none transition-all text-right" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(formatoService.capitalizarPrimeraLetra(e.target.value))} rows={3}
                      placeholder="Aclaraciones técnicas o comerciales..."
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-red-600 rounded-2xl text-sm font-bold outline-none resize-none transition-all" />
          </div>
        </div>

      </main>
    </div>
  );
}

export default function NuevoPresupuestoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-bold animate-pulse">Cargando...</div>}>
      <NuevoPresupuestoForm />
    </Suspense>
  );
}
