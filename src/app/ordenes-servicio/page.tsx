"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface OrdenServicio {
  id: string;
  numero: number;
  estado: string;
  descripcion: string | null;
  ubicacion: string | null;
  observaciones: string | null;
  fecha: string;
  fechaProgramada: string | null;
  horasCampo: number;
  kilometros: number;
  imprevistos: number;
  valorHora: number;
  valorKm: number;
  iva: number;
  tipoCambio: number;
  clienteId: string;
  cliente: { nombre: string; empresa: { nombre: string } | null };
  tecnico: { nombre: string } | null;
  presupuestos: { id: string; numero: number; estado: string }[];
}

const ESTADOS: Record<string, { label: string; color: string }> = {
  PENDIENTE:  { label: "Pendiente",  color: "bg-gray-100 text-gray-700" },
  PROGRAMADO: { label: "Programado", color: "bg-blue-100 text-blue-700" },
  EN_CURSO:   { label: "En curso",   color: "bg-yellow-100 text-yellow-700" },
  REALIZADO:  { label: "Realizado",  color: "bg-green-100 text-green-700" },
  CANCELADO:  { label: "Cancelado",  color: "bg-red-100 text-red-700" },
};

function calcular(params: {
  horasCampo: number; kilometros: number; imprevistos: number;
  valorHora: number; valorKm: number; iva: number; tipoCambio: number;
}) {
  const baseUSD = 2 * params.valorHora;
  const campoUSD = params.horasCampo * params.valorHora;
  const kmUSD = params.kilometros * params.valorKm;
  const subtotalUSD = baseUSD + campoUSD + kmUSD + params.imprevistos;
  const ivaUSD = subtotalUSD * params.iva;
  const totalUSD = subtotalUSD + ivaUSD;
  const totalARS = totalUSD * params.tipoCambio;
  return { baseUSD, campoUSD, kmUSD, subtotalUSD, ivaUSD, totalUSD, totalARS };
}

export default function OrdenesServicioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetalle, setShowDetalle] = useState<OrdenServicio | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [creandoPresupuesto, setCreandoPresupuesto] = useState<string | null>(null);

  const [clientes, setClientes] = useState<{ id: string; nombre: string; empresa: { nombre: string } | null }[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string }[]>([]);

  // Parámetros globales de la calculadora (editables)
  const [params, setParams] = useState({
    valorHora: 55,
    valorKm: 1.7,
    iva: 0.21,
    tipoCambio: 1420,
  });

  // Calculadora rápida
  const [calc, setCalc] = useState({ horasCampo: 0, kilometros: 0, imprevistos: 0 });

  // Formulario nueva OS
  const [form, setForm] = useState({
    clienteId: "",
    tecnicoId: "",
    descripcion: "",
    ubicacion: "",
    observaciones: "",
    fechaProgramada: "",
    horasCampo: 0,
    kilometros: 0,
    imprevistos: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchOrdenes = useCallback(async () => {
    const res = await fetch("/api/ordenes-servicio");
    if (res.ok) setOrdenes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrdenes();
    fetch("/api/clientes").then(r => r.ok ? r.json() : []).then(setClientes);
    fetch("/api/tecnicos").then(r => r.ok ? r.json() : []).then(setTecnicos);
  }, [fetchOrdenes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/ordenes-servicio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ...params,
        creadorId: (session?.user as { id?: string })?.id,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ clienteId: "", tecnicoId: "", descripcion: "", ubicacion: "", observaciones: "", fechaProgramada: "", horasCampo: 0, kilometros: 0, imprevistos: 0 });
      fetchOrdenes();
    }
  };

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`/api/ordenes-servicio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    fetchOrdenes();
    if (showDetalle?.id === id) setShowDetalle(prev => prev ? { ...prev, estado } : null);
  };

  const crearPresupuesto = async (orden: OrdenServicio) => {
    setCreandoPresupuesto(orden.id);
    const resultado = calcular({
      horasCampo: orden.horasCampo,
      kilometros: orden.kilometros,
      imprevistos: orden.imprevistos,
      valorHora: orden.valorHora,
      valorKm: orden.valorKm,
      iva: orden.iva,
      tipoCambio: orden.tipoCambio,
    });

    const items = [
      { descripcion: `Mínimo 2 horas base (campo)`, cantidad: 1, precio: Math.round(resultado.baseUSD * orden.tipoCambio), total: Math.round(resultado.baseUSD * orden.tipoCambio) },
    ];
    if (orden.horasCampo > 0) items.push({ descripcion: `Horas de trabajo en campo (${orden.horasCampo}h × $${orden.valorHora} USD)`, cantidad: 1, precio: Math.round(resultado.campoUSD * orden.tipoCambio), total: Math.round(resultado.campoUSD * orden.tipoCambio) });
    if (orden.kilometros > 0) items.push({ descripcion: `Kilómetros recorridos — solo ida (${orden.kilometros} km × $${orden.valorKm} USD)`, cantidad: 1, precio: Math.round(resultado.kmUSD * orden.tipoCambio), total: Math.round(resultado.kmUSD * orden.tipoCambio) });
    if (orden.imprevistos > 0) items.push({ descripcion: `Imprevistos / gastos adicionales`, cantidad: 1, precio: Math.round(orden.imprevistos * orden.tipoCambio), total: Math.round(orden.imprevistos * orden.tipoCambio) });

    const res = await fetch("/api/presupuestos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: orden.clienteId,
        usuarioId: (session?.user as { id?: string })?.id,
        ordenServicioId: orden.id,
        incluyeIva: true,
        moneda: "ARS",
        observaciones: `Presupuesto generado desde OS-${orden.numero}. Total: USD ${resultado.totalUSD.toFixed(2)} / ARS ${resultado.totalARS.toLocaleString("es-AR")}`,
        items,
      }),
    });
    setCreandoPresupuesto(null);
    if (res.ok) fetchOrdenes();
  };

  const ordenesFiltradas = ordenes.filter(o => {
    const matchEstado = filtroEstado === "TODOS" || o.estado === filtroEstado;
    const txt = busqueda.toLowerCase();
    const matchBusqueda = !txt ||
      o.numero.toString().includes(txt) ||
      o.cliente.nombre.toLowerCase().includes(txt) ||
      (o.cliente.empresa?.nombre || "").toLowerCase().includes(txt) ||
      (o.descripcion || "").toLowerCase().includes(txt) ||
      (o.ubicacion || "").toLowerCase().includes(txt);
    return matchEstado && matchBusqueda;
  });

  const stats = {
    total: ordenes.length,
    pendientes: ordenes.filter(o => o.estado === "PENDIENTE" || o.estado === "PROGRAMADO").length,
    enCurso: ordenes.filter(o => o.estado === "EN_CURSO").length,
    realizadas: ordenes.filter(o => o.estado === "REALIZADO").length,
  };

  const resultCalc = calcular({ ...calc, ...params });
  const resultForm = calcular({ horasCampo: form.horasCampo, kilometros: form.kilometros, imprevistos: form.imprevistos, ...params });

  const fmt = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-gray-500 hover:text-gray-700">← Menú</button>
          <h1 className="text-xl font-bold text-gray-900">Órdenes de Servicio</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          + Nueva OS
        </button>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-white" },
            { label: "Pendientes / Programadas", value: stats.pendientes, color: "text-blue-700", bg: "bg-blue-50" },
            { label: "En curso", value: stats.enCurso, color: "text-yellow-700", bg: "bg-yellow-50" },
            { label: "Realizadas", value: stats.realizadas, color: "text-green-700", bg: "bg-green-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-gray-200 rounded-xl p-4`}>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className={`text-sm ${s.color} mt-1`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Calculadora */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Calculadora de tarifas — campo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parámetros */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Parámetros base</p>
              <div className="space-y-2">
                {[
                  { label: "Valor hora técnica (USD)", key: "valorHora", step: 1 },
                  { label: "Valor km — solo ida (USD)", key: "valorKm", step: 0.1 },
                  { label: "IVA (%)", key: "iva", step: 0.01, display: (v: number) => (v * 100).toFixed(0), parse: (s: string) => parseFloat(s) / 100 },
                  { label: "Tipo de cambio (ARS/USD)", key: "tipoCambio", step: 10 },
                ].map(({ label, key, step, display, parse }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <label className="text-sm text-gray-600 flex-1">{label}</label>
                    <input
                      type="number"
                      step={step}
                      value={display ? display(params[key as keyof typeof params]) : params[key as keyof typeof params]}
                      onChange={e => setParams(p => ({ ...p, [key]: parse ? parse(e.target.value) : parseFloat(e.target.value) || 0 }))}
                      className="w-28 px-2 py-1 border border-yellow-300 bg-yellow-50 rounded text-sm text-right outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-1">Mínimo garantizado: 2h × ${params.valorHora} = <strong>USD {(2 * params.valorHora).toFixed(0)}</strong> / <strong>ARS {((2 * params.valorHora) * params.tipoCambio).toLocaleString("es-AR")}</strong></p>
              </div>
            </div>

            {/* Cotización rápida */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Cotización rápida</p>
              <div className="space-y-2">
                {[
                  { label: "Horas de trabajo en campo", key: "horasCampo", step: 0.5 },
                  { label: "Kilómetros recorridos (solo ida)", key: "kilometros", step: 1 },
                  { label: "Imprevistos / adicionales (USD)", key: "imprevistos", step: 10 },
                ].map(({ label, key, step }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <label className="text-sm text-gray-600 flex-1">{label}</label>
                    <input
                      type="number"
                      step={step}
                      min={0}
                      value={calc[key as keyof typeof calc]}
                      onChange={e => setCalc(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))}
                      className="w-28 px-2 py-1 border border-yellow-300 bg-yellow-50 rounded text-sm text-right outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                ))}
              </div>
              {/* Resultado */}
              <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Base 2h</span>
                  <span>USD {fmt(resultCalc.baseUSD)}</span>
                </div>
                {calc.horasCampo > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Horas campo</span>
                    <span>USD {fmt(resultCalc.campoUSD)}</span>
                  </div>
                )}
                {calc.kilometros > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Kilómetros</span>
                    <span>USD {fmt(resultCalc.kmUSD)}</span>
                  </div>
                )}
                {calc.imprevistos > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Imprevistos</span>
                    <span>USD {fmt(calc.imprevistos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-1">
                  <span>Subtotal sin IVA</span>
                  <span>USD {fmt(resultCalc.subtotalUSD)}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>IVA {(params.iva * 100).toFixed(0)}%</span>
                  <span>USD {fmt(resultCalc.ivaUSD)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-300 pt-1">
                  <span>TOTAL</span>
                  <span className="text-right">
                    <span className="text-red-600">USD {fmt(resultCalc.totalUSD)}</span>
                    <span className="text-gray-400 font-normal text-xs ml-2">/ ARS {resultCalc.totalARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y tabla */}
        <div>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Buscar por N°, cliente, descripción, ubicación..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
            />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg outline-none"
            >
              <option value="TODOS">Todos los estados</option>
              {Object.entries(ESTADOS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          <p className="text-sm text-gray-500 mb-3">{ordenesFiltradas.length} órdenes encontradas</p>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">OS</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción / Ubicación</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Técnico</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Total (USD)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Presupuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesFiltradas.map(orden => {
                    const res = calcular({
                      horasCampo: orden.horasCampo,
                      kilometros: orden.kilometros,
                      imprevistos: orden.imprevistos,
                      valorHora: orden.valorHora,
                      valorKm: orden.valorKm,
                      iva: orden.iva,
                      tipoCambio: orden.tipoCambio,
                    });
                    return (
                      <tr
                        key={orden.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setShowDetalle(orden)}
                      >
                        <td className="px-4 py-3 font-medium">OS-{orden.numero}</td>
                        <td className="px-4 py-3">
                          <div>{orden.cliente.empresa?.nombre || "Particular"}</div>
                          <div className="text-gray-500 text-xs">{orden.cliente.nombre}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-[220px] truncate text-gray-700">{orden.descripcion || "—"}</div>
                          {orden.ubicacion && <div className="text-gray-400 text-xs truncate">{orden.ubicacion}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADOS[orden.estado]?.color || "bg-gray-100"}`}>
                            {ESTADOS[orden.estado]?.label || orden.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{orden.tecnico?.nombre || "—"}</td>
                        <td className="px-4 py-3 font-medium text-red-700">USD {fmt(res.totalUSD)}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(orden.fecha).toLocaleDateString("es-AR")}
                          {orden.fechaProgramada && (
                            <div className="text-xs text-blue-600">
                              Prog: {new Date(orden.fechaProgramada).toLocaleDateString("es-AR")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {orden.presupuestos.length > 0 ? (
                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                              P-{orden.presupuestos[0].numero}
                            </span>
                          ) : (
                            <button
                              onClick={() => crearPresupuesto(orden)}
                              disabled={creandoPresupuesto === orden.id}
                              className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                            >
                              {creandoPresupuesto === orden.id ? "..." : "+ Presupuesto"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {ordenesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        No hay órdenes de servicio
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Panel lateral: Nueva OS */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Nueva Orden de Servicio</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  value={form.clienteId}
                  onChange={e => setForm({ ...form, clienteId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.empresa?.nombre || "Particular"} — {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
                <select
                  value={form.tecnicoId}
                  onChange={e => setForm({ ...form, tecnicoId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                >
                  <option value="">Sin asignar</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del servicio</label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  rows={2}
                  placeholder="Descripción del trabajo a realizar..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación / Dirección</label>
                <input
                  type="text"
                  value={form.ubicacion}
                  onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  placeholder="Ej: Ruta 9 km 14, Rosario de la Frontera"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha programada</label>
                <input
                  type="date"
                  value={form.fechaProgramada}
                  onChange={e => setForm({ ...form, fechaProgramada: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                />
              </div>

              {/* Calculadora en el form */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                <p className="text-sm font-medium text-gray-700">Cotización del servicio</p>
                {[
                  { label: "Horas de trabajo en campo", key: "horasCampo", step: 0.5 },
                  { label: "Kilómetros recorridos (solo ida)", key: "kilometros", step: 1 },
                  { label: "Imprevistos / adicionales (USD)", key: "imprevistos", step: 10 },
                ].map(({ label, key, step }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <label className="text-sm text-gray-600">{label}</label>
                    <input
                      type="number"
                      step={step}
                      min={0}
                      value={form[key as keyof typeof form] as number}
                      onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                      className="w-28 px-2 py-1 border border-yellow-300 bg-yellow-50 rounded text-sm text-right outline-none"
                    />
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal sin IVA</span>
                    <span>USD {fmt(resultForm.subtotalUSD)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>TOTAL c/ IVA</span>
                    <span className="text-red-600">USD {fmt(resultForm.totalUSD)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>En pesos</span>
                    <span>ARS {resultForm.totalARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                  rows={2}
                />
              </div>
              <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
                Crear Orden de Servicio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Panel lateral: Detalle OS */}
      {showDetalle && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50" onClick={() => setShowDetalle(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">OS-{showDetalle.numero}</h2>
                <p className="text-sm text-gray-500">{showDetalle.cliente.empresa?.nombre || "Particular"} — {showDetalle.cliente.nombre}</p>
              </div>
              <button onClick={() => setShowDetalle(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Estado */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Estado</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ESTADOS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => cambiarEstado(showDetalle.id, key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${showDetalle.estado === key ? val.color + " border-current" : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"}`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3 text-sm">
              {showDetalle.descripcion && (
                <div><p className="text-xs text-gray-500">Descripción</p><p className="text-gray-800">{showDetalle.descripcion}</p></div>
              )}
              {showDetalle.ubicacion && (
                <div><p className="text-xs text-gray-500">Ubicación</p><p className="text-gray-800">{showDetalle.ubicacion}</p></div>
              )}
              {showDetalle.tecnico && (
                <div><p className="text-xs text-gray-500">Técnico</p><p className="text-gray-800">{showDetalle.tecnico.nombre}</p></div>
              )}
              {showDetalle.fechaProgramada && (
                <div><p className="text-xs text-gray-500">Fecha programada</p><p className="text-gray-800">{new Date(showDetalle.fechaProgramada).toLocaleDateString("es-AR")}</p></div>
              )}
              {showDetalle.observaciones && (
                <div><p className="text-xs text-gray-500">Observaciones</p><p className="text-gray-700">{showDetalle.observaciones}</p></div>
              )}
            </div>

            {/* Detalle cotización */}
            <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-3">Detalle cotización</p>
              {(() => {
                const r = calcular({
                  horasCampo: showDetalle.horasCampo,
                  kilometros: showDetalle.kilometros,
                  imprevistos: showDetalle.imprevistos,
                  valorHora: showDetalle.valorHora,
                  valorKm: showDetalle.valorKm,
                  iva: showDetalle.iva,
                  tipoCambio: showDetalle.tipoCambio,
                });
                return (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600"><span>Base 2h (${showDetalle.valorHora} USD/h)</span><span>USD {fmt(r.baseUSD)}</span></div>
                    {showDetalle.horasCampo > 0 && <div className="flex justify-between text-gray-600"><span>Campo {showDetalle.horasCampo}h</span><span>USD {fmt(r.campoUSD)}</span></div>}
                    {showDetalle.kilometros > 0 && <div className="flex justify-between text-gray-600"><span>{showDetalle.kilometros} km ida</span><span>USD {fmt(r.kmUSD)}</span></div>}
                    {showDetalle.imprevistos > 0 && <div className="flex justify-between text-gray-600"><span>Imprevistos</span><span>USD {fmt(showDetalle.imprevistos)}</span></div>}
                    <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-1"><span>Subtotal sin IVA</span><span>USD {fmt(r.subtotalUSD)}</span></div>
                    <div className="flex justify-between text-gray-500 text-xs"><span>IVA {(showDetalle.iva * 100).toFixed(0)}%</span><span>USD {fmt(r.ivaUSD)}</span></div>
                    <div className="flex justify-between font-bold text-gray-900 border-t border-gray-300 pt-1">
                      <span>TOTAL</span>
                      <span className="text-right">
                        <span className="text-red-600">USD {fmt(r.totalUSD)}</span>
                        <span className="text-gray-400 font-normal text-xs ml-1">/ ARS {r.totalARS.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 pt-1">T/C: ${showDetalle.tipoCambio} ARS/USD</div>
                  </div>
                );
              })()}
            </div>

            {/* Presupuestos vinculados */}
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Presupuesto vinculado</p>
              {showDetalle.presupuestos.length > 0 ? (
                showDetalle.presupuestos.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <span className="font-medium text-green-800">Presupuesto #{p.numero}</span>
                    <span className="text-xs text-green-600">{p.estado}</span>
                  </div>
                ))
              ) : (
                <button
                  onClick={() => crearPresupuesto(showDetalle)}
                  disabled={creandoPresupuesto === showDetalle.id}
                  className="w-full py-2 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  {creandoPresupuesto === showDetalle.id ? "Creando..." : "+ Crear presupuesto vinculado"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
