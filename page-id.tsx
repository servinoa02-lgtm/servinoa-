"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Orden {
  id: string;
  numero: number;
  fechaRecepcion: string;
  fechaEntrega: string | null;
  estado: string;
  falla: string;
  observaciones: string;
  nroSerie: string;
  accesorios: string;
  cliente: { nombre: string; telefono?: string; dni?: string; email?: string; empresa?: { nombre: string } | null };
  tecnico?: { id: string; nombre: string } | null;
  creador: { nombre: string };
  maquina?: { nombre: string } | null;
  marca?: { nombre: string } | null;
  modelo?: { nombre: string } | null;
  presupuestos: any[];
  notas: any[];
}

const FLUJO_ESTADOS: Record<string, string[]> = {
  RECIBIDO: ["PARA_REVISAR"],
  PARA_REVISAR: ["EN_REVISION"],
  EN_REVISION: ["REVISADO"],
  REVISADO: ["PARA_PRESUPUESTAR"],
  PARA_PRESUPUESTAR: ["PRESUPUESTADO"],
  PRESUPUESTADO: ["APROBADO", "RECHAZADO"],
  APROBADO: ["EN_REPARACION"],
  EN_REPARACION: ["REPARADO"],
  REPARADO: ["PARA_ENTREGAR"],
  PARA_ENTREGAR: ["ENTREGADO_REALIZADO", "ENTREGADO_SIN_REALIZAR"],
  ENTREGADO_REALIZADO: [],
  ENTREGADO_SIN_REALIZAR: [],
  RECHAZADO: ["PARA_ENTREGAR"],
};

const estadoColors: Record<string, string> = {
  RECIBIDO: "bg-gray-100 text-gray-700 border-gray-300",
  PARA_REVISAR: "bg-yellow-100 text-yellow-700 border-yellow-300",
  EN_REVISION: "bg-blue-100 text-blue-700 border-blue-300",
  REVISADO: "bg-orange-100 text-orange-700 border-orange-300",
  PARA_PRESUPUESTAR: "bg-red-100 text-red-700 border-red-300",
  PRESUPUESTADO: "bg-purple-100 text-purple-700 border-purple-300",
  APROBADO: "bg-green-100 text-green-700 border-green-300",
  EN_REPARACION: "bg-blue-200 text-blue-800 border-blue-400",
  REPARADO: "bg-teal-100 text-teal-700 border-teal-300",
  PARA_ENTREGAR: "bg-cyan-100 text-cyan-700 border-cyan-300",
  ENTREGADO_REALIZADO: "bg-green-200 text-green-800 border-green-400",
  ENTREGADO_SIN_REALIZAR: "bg-orange-200 text-orange-800 border-orange-400",
  RECHAZADO: "bg-red-200 text-red-800 border-red-400",
};

const TODOS_ESTADOS = [
  "RECIBIDO", "PARA_REVISAR", "EN_REVISION", "REVISADO",
  "PARA_PRESUPUESTAR", "PRESUPUESTADO", "APROBADO", "EN_REPARACION",
  "REPARADO", "PARA_ENTREGAR", "ENTREGADO_REALIZADO", "ENTREGADO_SIN_REALIZAR", "RECHAZADO",
];

function formatEstado(estado: string) {
  return estado.replace(/_/g, " ");
}

export default function OrdenDetallePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [mostrarTodosEstados, setMostrarTodosEstados] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (id) {
      fetch(`/api/ordenes/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setOrden(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!orden) return;
    setActualizando(true);
    const res = await fetch(`/api/ordenes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      const data = await res.json();
      setOrden(data);
    }
    setActualizando(false);
    setMostrarTodosEstados(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!orden || (orden as { error?: string }).error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">OT no encontrada</p>
      </div>
    );
  }

  const siguientesEstados = FLUJO_ESTADOS[orden.estado] || [];
  const equipo = [orden.maquina?.nombre, orden.marca?.nombre, orden.modelo?.nombre]
    .filter(Boolean)
    .join(" - ");
  const clienteNombre = orden.cliente?.empresa
    ? `${orden.cliente.empresa.nombre} - ${orden.cliente.nombre}`
    : orden.cliente?.nombre;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/ordenes")} className="text-gray-500 hover:text-gray-700">
            ← Órdenes
          </button>
          <h1 className="text-xl font-bold text-gray-900">OT-{orden.numero}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${estadoColors[orden.estado] || "bg-gray-100"}`}>
            {formatEstado(orden.estado)}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">

        {/* ACCIONES DE ESTADO */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Cambiar Estado</h2>
          {siguientesEstados.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {siguientesEstados.map((est) => (
                <button
                  key={est}
                  onClick={() => cambiarEstado(est)}
                  disabled={actualizando}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all hover:shadow-md disabled:opacity-50 ${estadoColors[est] || "bg-gray-100"}`}
                >
                  → {formatEstado(est)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-3">Estado final alcanzado</p>
          )}
          <button
            onClick={() => setMostrarTodosEstados(!mostrarTodosEstados)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {mostrarTodosEstados ? "Ocultar todos" : "Forzar otro estado..."}
          </button>
          {mostrarTodosEstados && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {TODOS_ESTADOS.filter((e) => e !== orden.estado).map((est) => (
                <button
                  key={est}
                  onClick={() => cambiarEstado(est)}
                  disabled={actualizando}
                  className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  {formatEstado(est)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DATOS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Datos del Cliente</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium">{clienteNombre}</span>
              </div>
              {orden.cliente?.telefono && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Teléfono</span>
                  <a href={`tel:${orden.cliente.telefono}`} className="font-medium text-blue-600">{orden.cliente.telefono}</a>
                </div>
              )}
              {orden.cliente?.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{orden.cliente.email}</span>
                </div>
              )}
              {orden.cliente?.dni && (
                <div className="flex justify-between">
                  <span className="text-gray-500">DNI</span>
                  <span className="font-medium">{orden.cliente.dni}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Datos del Equipo</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Equipo</span>
                <span className="font-medium">{equipo || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">N° Serie</span>
                <span className="font-medium">{orden.nroSerie || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Accesorios</span>
                <span className="font-medium">{orden.accesorios || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FALLA Y OBSERVACIONES */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Detalle del Trabajo</h2>
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Falla reportada</span>
              <p className="font-medium bg-gray-50 p-3 rounded-lg">{orden.falla || "-"}</p>
            </div>
            {orden.observaciones && (
              <div>
                <span className="text-gray-500 block mb-1">Observaciones</span>
                <p className="font-medium bg-gray-50 p-3 rounded-lg">{orden.observaciones}</p>
              </div>
            )}
          </div>
        </div>

        {/* INFO ADICIONAL */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Información</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block">Fecha recepción</span>
              <span className="font-medium">{new Date(orden.fechaRecepcion).toLocaleDateString("es-AR")}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Fecha entrega</span>
              <span className="font-medium">{orden.fechaEntrega ? new Date(orden.fechaEntrega).toLocaleDateString("es-AR") : "-"}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Técnico</span>
              <span className="font-medium">{orden.tecnico?.nombre || "Sin asignar"}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Creada por</span>
              <span className="font-medium">{orden.creador?.nombre}</span>
            </div>
          </div>
        </div>

        {/* PRESUPUESTOS */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Presupuestos ({orden.presupuestos?.length || 0})</h2>
            {(orden.estado === "PARA_PRESUPUESTAR" || orden.estado === "REVISADO") && (
              <button
                onClick={() => router.push(`/presupuestos/nuevo?otId=${orden.id}`)}
                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
              >
                + Nuevo Presupuesto
              </button>
            )}
          </div>
          {orden.presupuestos?.length > 0 ? (
            <div className="space-y-2">
              {orden.presupuestos.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => router.push(`/presupuestos/${p.id}`)}
                >
                  <div>
                    <span className="font-medium text-sm">Ppto N°{p.numero}</span>
                    <span className="text-xs text-gray-500 ml-2">{new Date(p.createdAt).toLocaleDateString("es-AR")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">${p.total?.toLocaleString("es-AR") || "0"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.estado === "APROBADO" ? "bg-green-100 text-green-700" :
                      p.estado === "RECHAZADO" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No hay presupuestos todavía</p>
          )}
        </div>

      </main>
    </div>
  );
}