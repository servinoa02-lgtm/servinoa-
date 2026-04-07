"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Clock, AlertCircle } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";

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
      body: JSON.stringify(form)
    });
    setMostrarForm(false);
    setForm({ ...form, descripcion: "", vencimiento: "" });
    cargar();
  };

  if (loading) return <div className="text-center p-10 text-slate-500 animate-pulse">Cargando tablero...</div>;

  const tareasOrdenadas = tareas.sort((a, b) => {
    if (a.estado === "COMPLETADA" && b.estado !== "COMPLETADA") return 1;
    if (a.estado !== "COMPLETADA" && b.estado === "COMPLETADA") return -1;
    return new Date(a.vencimiento).getTime() - new Date(b.vencimiento).getTime();
  });

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800">Tablero General</h2>
        <button
          onClick={() => setMostrarForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Plus size={16} /> Nueva Tarea
        </button>
      </div>

      <div className="grid gap-4">
        {tareasOrdenadas.map((t) => {
          const isVencida = t.vencimiento && new Date(t.vencimiento) < new Date() && t.estado !== "COMPLETADA";
          const isCompletada = t.estado === "COMPLETADA";

          return (
            <div key={t.id} className={`bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4 transition-all ${isCompletada ? 'opacity-60 border-slate-200' : isVencida ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
              <button
                onClick={() => toggleEstado(t.id, t.estado)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isCompletada ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400 text-transparent hover:text-indigo-200'}`}
              >
                <Check size={18} strokeWidth={3} />
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium ${isCompletada ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                  {t.descripcion}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                    Resp: {t.usuario?.nombre}
                  </span>
                  <span className={`font-bold ${t.prioridad === 'URGENTE' && !isCompletada ? 'text-rose-600' : ''}`}>
                    {t.prioridad}
                  </span>
                  {t.vencimiento && (
                    <span className={`flex items-center gap-1 ${isVencida ? 'text-red-600 font-bold' : ''}`}>
                      {isVencida ? <AlertCircle size={14}/> : <Clock size={14}/>} 
                      {new Date(t.vencimiento).toLocaleDateString('es-AR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {tareas.length === 0 && (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
            No hay tareas en el tablero. Crea la primera asignando a un técnico.
          </div>
        )}
      </div>

      <Drawer isOpen={mostrarForm} onClose={() => setMostrarForm(false)} title="Asignar Nueva Tarea">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Descripción</label>
            <textarea 
              value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
              rows={3} placeholder="¿Qué hay que hacer?" 
            />
          </div>
          <div>
             <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Responsable</label>
             <select 
               value={form.usuarioId} onChange={e => setForm({...form, usuarioId: e.target.value})}
               className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
             >
               {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
             </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Prioridad</label>
              <select 
                value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Límite</label>
              <input 
                type="date" value={form.vencimiento} onChange={e => setForm({...form, vencimiento: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={crearTarea} disabled={!form.descripcion}
            className="mt-6 w-full flex justify-center py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            Asignar Tarea
          </button>
        </div>
      </Drawer>
    </>
  );
}
