"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Clock, AlertCircle, Search, User, Calendar, Activity } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function TareasClient({ usuarios }: { usuarios: any[] }) {
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [form, setForm] = useState({
    descripcion: "",
    prioridad: "MEDIA",
    usuarioId: usuarios[0]?.id || "",
    vencimiento: ""
  });

  const cargar = () => {
    fetch("/api/tareas")
      .then(res => res.json())
      .then(data => { setTareas(data); setLoading(false); });
  };

  useEffect(() => { cargar(); }, []);

  const toggleEstado = async (id: string, actual: string) => {
    const nuevo = actual === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA";
    await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevo })
    });
    cargar();
  };

  const crearTarea = async () => {
    if (!form.descripcion.trim()) return;
    await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        descripcion: form.descripcion.toUpperCase()
      })
    });
    setMostrarForm(false);
    setForm({ ...form, descripcion: "", vencimiento: "" });
    cargar();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
      <div className="text-gray-400 font-medium text-sm animate-pulse">Cargando tablero...</div>
    </div>
  );

  const tareasOrdenadas = [...tareas].sort((a, b) => {
    if (a.estado === "COMPLETADA" && b.estado !== "COMPLETADA") return 1;
    if (a.estado !== "COMPLETADA" && b.estado === "COMPLETADA") return -1;
    return new Date(a.vencimiento).getTime() - new Date(b.vencimiento).getTime();
  });

  return (
    <>
      <div className="mb-10 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
           <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Estado de Operaciones</p>
           <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Tablero de Tareas</h2>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10 flex items-center gap-2"
        >
          <Plus size={20} /> Asignar Tarea
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tareasOrdenadas.map((t) => {
          const isVencida = t.vencimiento && new Date(t.vencimiento) < new Date() && t.estado !== "COMPLETADA";
          const isCompletada = t.estado === "COMPLETADA";

          return (
            <div 
              key={t.id} 
              className={`bg-white p-6 rounded-2xl shadow-sm border flex flex-col sm:flex-row items-center gap-6 transition-all ${isCompletada ? 'opacity-50 grayscale bg-gray-50/50' : isVencida ? 'border-red-200 bg-red-50/10' : 'border-gray-100'}`}
            >
              <button
                onClick={() => toggleEstado(t.id, t.estado)}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 active:scale-95 ${isCompletada ? 'border-red-600 bg-red-600 text-white shadow-md shadow-red-600/20' : 'border-gray-200 text-transparent hover:text-red-600 bg-white hover:border-red-600 shadow-sm'}`}
              >
                <Check size={24} strokeWidth={3} />
              </button>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <p className={`text-base font-bold leading-snug ${isCompletada ? 'text-gray-400 line-through' : 'text-gray-900 uppercase'}`}>
                    {t.descripcion}
                  </p>
                  <div className="shrink-0">
                    <StatusBadge status={isVencida && !isCompletada ? 'URGENTE' : isCompletada ? 'COMPLETADA' : t.prioridad} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User size={14} className="text-red-600 opacity-50" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t.usuario?.nombre}</span>
                  </div>
                  
                  {t.vencimiento && (
                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isVencida ? 'text-red-600 animate-pulse' : 'text-gray-400'}`}>
                      {isVencida ? <AlertCircle size={14}/> : <Calendar size={14}/>} 
                      Vence: {new Date(t.vencimiento).toLocaleDateString('es-AR')}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-gray-300 ml-auto">
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">ID: {t.id.substring(0,8).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {tareas.length === 0 && (
          <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 italic">
             <p className="text-sm font-medium text-gray-400">No hay tareas pendientes en el tablero</p>
          </div>
        )}
      </div>

      <Drawer isOpen={mostrarForm} onClose={() => setMostrarForm(false)} title="Asignar Nueva Tarea">
        <div className="p-1 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Descripción</label>
               <textarea 
                 value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
                 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none uppercase min-h-[120px]" 
                 placeholder="Instrucciones de la tarea..." 
               />
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Asignar a</label>
               <select 
                 value={form.usuarioId} onChange={e => setForm({...form, usuarioId: e.target.value})}
                 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none uppercase appearance-none cursor-pointer"
               >
                 {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
               </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Prioridad</label>
                <select 
                  value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold uppercase outline-none cursor-pointer"
                >
                  <option value="BAJA">Baja / Normal</option>
                  <option value="MEDIA">Media / Estándar</option>
                  <option value="ALTA">Alta / Crítica</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Vencimiento</label>
                <input 
                  type="date" value={form.vencimiento} onChange={e => setForm({...form, vencimiento: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={crearTarea} disabled={!form.descripcion}
              className="w-full py-4 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20"
            >
              Publicar Tarea
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
