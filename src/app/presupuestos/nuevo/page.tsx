"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface Cliente {
  id: string;
  nombre: string;
  empresa?: { nombre: string } | null;
}

interface Orden {
  id: string;
  numero: number;
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
  const otId = searchParams.get("otId");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [orden, setOrden] = useState<Orden | null>(null);
  const [clienteId, setClienteId] = useState("");
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
  const [nuevoEmpresa, setNuevoEmpresa] = useState("Particular");
  const [nuevoDni, setNuevoDni] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
  }, []);

  useEffect(() => {
    if (otId) {
      fetch(`/api/ordenes/${otId}`)
        .then((r) => r.json())
        .then((data) => {
          setOrden(data);
          setClienteId(data.cliente?.id || "");
        });
    }
  }, [otId]);

  const subtotal = items.reduce((sum, item) => sum + item.cantidad * item.precio, 0);
  const iva = incluyeIva ? subtotal * 0.21 : 0;
  const total = subtotal + iva;

  const agregarItem = () => setItems([...items, { cantidad: 1, descripcion: "", precio: 0 }]);
  const eliminarItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };

  const actualizarItem = (idx: number, campo: keyof Item, valor: string | number) => {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], [campo]: campo === "descripcion" ? valor : parseFloat(valor as string) || 0 };
    setItems(nuevos);
  };

  const handleCrearCliente = async () => {
    if (!nuevoNombre) return;
    setCreandoCliente(true);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoNombre, telefono: nuevoTelefono, empresaNombre: nuevoEmpresa !== "Particular" ? nuevoEmpresa : null, dni: nuevoDni }),
    });
    if (res.ok) {
      const cliente = await res.json();
      setClientes((prev) => [...prev, cliente]);
      setClienteId(cliente.id);
      setMostrarNuevoCliente(false);
      setNuevoNombre(""); setNuevoTelefono(""); setNuevoEmpresa("Particular"); setNuevoDni("");
    }
    setCreandoCliente(false);
  };

  const guardar = async () => {
    if (!clienteId) { setError("Seleccioná un cliente"); return; }
    if (items.some((i) => !i.descripcion)) { setError("Completá la descripción de todos los ítems"); return; }
    setGuardando(true);
    setError("");

    const res = await fetch("/api/presupuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        ordenId: otId || null,
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

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center p-12">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium">← Volver</button>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Cargar Nuevo Presupuesto</h1>
        </div>
        <button onClick={guardar} disabled={guardando} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors">
          {guardando ? "Generando..." : "Generar Presupuesto"}
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">{error}</div>}

        {orden && (
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex gap-2">
            <span className="text-xl">⚙️</span>
            <p className="text-sm font-medium text-blue-900 mt-0.5">
              Acoplando Presupuesto a OT-{orden.numero} — {[orden.maquina?.nombre, orden.marca?.nombre, orden.modelo?.nombre].filter(Boolean).join(" ")}
            </p>
          </div>
        )}

        {/* Cliente Dinamico */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Facturar Venta a</h2>
             {!orden && (
                <button type="button" onClick={() => setMostrarNuevoCliente(!mostrarNuevoCliente)} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100 border border-emerald-200 transition-colors">
                  {mostrarNuevoCliente ? "Seleccionar Existente" : "+ Alta Rápida de Cliente"}
                </button>
             )}
           </div>

           {orden ? (
               <div className="px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl">
                 <p className="text-sm font-semibold text-slate-900">
                   {orden.cliente?.empresa?.nombre ? `${orden.cliente.empresa.nombre} - ${orden.cliente.nombre}` : orden.cliente?.nombre}
                 </p>
                 <span className="text-xs text-slate-500">Cliente atado a la Orden de Trabajo.</span>
               </div>
           ) : !mostrarNuevoCliente ? (
               <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                 <option value="">Buscar en base de clientes...</option>
                 {clientes.map((c) => (
                   <option key={c.id} value={c.id}>{c.empresa ? `${c.empresa.nombre} - ${c.nombre}` : c.nombre}</option>
                 ))}
               </select>
           ) : (
               <div className="border border-emerald-200 bg-emerald-50/30 rounded-xl p-5 space-y-4">
                 <h4 className="text-xs font-bold uppercase text-emerald-800 tracking-wider">Nuevo Cliente Rápido</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                     <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Completo *</label>
                     <input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg text-sm bg-white" />
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-slate-600 mb-1">Empresa</label>
                     <input type="text" value={nuevoEmpresa} onChange={(e) => setNuevoEmpresa(e.target.value)} className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg text-sm bg-white" placeholder="Particular" />
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
                     <input type="text" value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg text-sm bg-white" />
                   </div>
                   <div className="col-span-2">
                     <button onClick={handleCrearCliente} disabled={!nuevoNombre || creandoCliente} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-sm border-b-4 border-emerald-800 active:border-b-0 active:translate-y-[4px] ease-out transition-all">
                       {creandoCliente ? "Creando..." : "Registrar y Seleccionar"}
                     </button>
                   </div>
                 </div>
               </div>
           )}
        </div>

        {/* Ítems */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Detalle a Facturar</h2>
            <button onClick={agregarItem} className="text-xs bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 px-4 py-2 rounded-lg transition-colors border border-slate-300 shadow-sm">+ Añadir línea</button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-12 gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">
              <div className="col-span-1">Cant</div>
              <div className="col-span-6">Descripción del Trabajo/Repuesto</div>
              <div className="col-span-2 text-right">Precio Unitario</div>
              <div className="col-span-2 text-right">Subtotal Línea</div>
              <div className="col-span-1 text-center">X</div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center group">
                  <input type="number" min="1" value={item.cantidad} onChange={(e) => actualizarItem(idx, "cantidad", e.target.value)} className="col-span-1 px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500 font-semibold" />
                  <input type="text" value={item.descripcion} onChange={(e) => actualizarItem(idx, "descripcion", e.target.value)} placeholder="Ej: Bobinado de motor, Rodamiento SKF..." className="col-span-6 px-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                  <input type="number" min="0" step="0.01" value={item.precio || ""} onChange={(e) => actualizarItem(idx, "precio", e.target.value)} placeholder="0.00" className="col-span-2 px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-right outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                  <div className="col-span-2 text-right text-sm font-bold text-slate-800 pr-2">
                    ${(item.cantidad * item.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </div>
                  <button onClick={() => eliminarItem(idx)} disabled={items.length === 1} className="col-span-1 text-slate-300 hover:text-red-500 text-center text-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 mx-auto">
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-slate-200 pt-6 space-y-3 max-w-sm ml-auto">
              <div className="flex justify-between items-center text-sm font-semibold text-slate-500 px-4">
                <span>Subtotal Partidas</span>
                <span>${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={`flex justify-between items-center text-sm px-4 ${incluyeIva ? 'font-bold text-emerald-600' : 'text-slate-400'}`}>
                <span>IVA {incluyeIva ? "(21%)" : "(No Aplicado)"}</span>
                <span>${iva.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-black text-2xl border-t border-slate-900 pt-4 px-4 text-slate-900">
                <span>Total</span>
                <span className="text-indigo-700">${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Condiciones Comerciales</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Impuestos</label>
              <select value={incluyeIva ? "si" : "no"} onChange={(e) => setIncluyeIva(e.target.value === "si")} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 outline-none">
                <option value="no">EXENTO / SIN IVA</option>
                <option value="si">APLICAR IVA +21%</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Forma de Pago Requerida</label>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 outline-none">
                <option>Contado / Transferencia</option>
                <option>Cheque a 30 Días</option>
                <option>Cheque a 60 Días</option>
                <option>Mercado Pago</option>
                <option>Otro Convenio</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Validez Oferta</label>
              <div className="relative">
                <input type="number" value={validezDias} onChange={(e) => setValidezDias(parseInt(e.target.value) || 7)} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 outline-none pr-12 text-right" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">DÍAS</span>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-6">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Notas Finales del Presupuesto</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Aclaraciones comerciales para el cliente..." className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm outline-none resize-none bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NuevoPresupuestoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-12"><p className="text-slate-500 font-bold animate-pulse text-xl">Iniciando cotizador...</p></div>}>
      <NuevoPresupuestoForm />
    </Suspense>
  );
}
