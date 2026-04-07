"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Clock, AlertCircle, CheckSquare, Search, Target, User, Calendar, Activity } from "lucide-react";
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
      <div className="w-16 h-1.5 bg-red-600 rounded-full animate-pulse mb-6" />
      <div className="text-center text-gray-400 font-black uppercase tracking-[0.4em] italic animate-pulse">
        SINCRONIZANDO TABLERO OPERATIVO...
      </div>
    </div>
  );

  const tareasOrdenadas = [...tareas].sort((a, b) => {
    if (a.estado === "COMPLETADA" && b.estado !== "COMPLETADA") return 1;
    if (a.estado !== "COMPLETADA" && b.estado === "COMPLETADA") return -1;
    return new Date(a.vencimiento).getTime() - new Date(b.vencimiento).getTime();
  });

  return (
    <>
      <div className="mb-14 flex flex-col lg:flex-row justify-between items-end gap-10">
        <div className="space-y-4">
           <div className="flex items-center gap-3">
              <span className="w-12 h-1.5 bg-red-600 rounded-full" />
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.4em] italic">MÓDULO DE LOGÍSTICA INTERNA</p>
           </div>
           <h2 className="text-5xl lg:text-6xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">TABLERO DE MANDO</h2>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="flex items-center gap-4 bg-red-600 text-white px-10 py-6 rounded-[24px] text-xs font-black hover:bg-red-700 transition-all shadow-2xl shadow-red-600/30 uppercase tracking-[0.2em] active:scale-95 group"
        >
          <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" /> 
          ASIGNAR NUEVA DIRECTIVA
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {tareasOrdenadas.map((t) => {
          const isVencida = t.vencimiento && new Date(t.vencimiento) < new Date() && t.estado !== "COMPLETADA";
          const isCompletada = t.estado === "COMPLETADA";

          return (
            <div 
              key={t.id} 
              className={`bg-white p-8 lg:p-10 rounded-[40px] shadow-2xl border-2 flex flex-col md:flex-row items-center gap-10 transition-all duration-500 ${isCompletada ? 'opacity-40 grayscale border-gray-100 bg-gray-50/50' : isVencida ? 'border-red-600 ring-4 ring-red-600/5 bg-red-50/20' : 'border-gray-50 hover:border-red-600/20 hover:shadow-red-600/5'}`}
            >
              <button
                onClick={() => toggleEstado(t.id, t.estado)}
                className={`w-20 h-20 rounded-[28px] border-4 flex items-center justify-center transition-all shrink-0 hover:scale-105 active:scale-90 ${isCompletada ? 'border-red-600 bg-red-600 text-white shadow-xl shadow-red-600/30' : 'border-gray-100 hover:border-red-600 text-transparent hover:text-red-600 bg-gray-50/50 shadow-inner'}`}
              >
                <Check size={32} strokeWidth={4} />
              </button>

              <div className="flex-1 min-w-0 space-y-6 w-full">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <p className={`text-2xl lg:text-3xl font-black italic uppercase tracking-tighter leading-[1.1] ${isCompletada ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-red-600'}`}>
                    {t.descripcion}
                  </p>
                  <div className="shrink-0">
                    <StatusBadge status={isVencida && !isCompletada ? 'CRÍTICO' : isCompletada ? 'COMPLETADO' : t.prioridad} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-6 border-t-2 border-gray-50">
                  <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-gray-900 text-white shadow-lg">
                    <User size={14} className="text-red-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">{t.usuario?.nombre}</span>
                  </div>
                  
                  {t.vencimiento && (
                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] italic transition-colors ${isVencida ? 'bg-red-600 text-white border-red-700 animate-pulse' : 'bg-white text-gray-400 border-gray-100'}`}>
                      {isVencida ? <AlertCircle size={14}/> : <Calendar size={14}/>} 
                      LÍMITE: {new Date(t.vencimiento).toLocaleDateString('es-AR')}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-gray-300 ml-auto">
                    <Activity size={18} />
                    <span className="text-[9px] font-black uppercase tracking-widest tabular-nums opacity-50">ID_LOG: {t.id.substring(0,8).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {tareas.length === 0 && (
          <div className="p-40 text-center bg-white rounded-[60px] border-4 border-dashed border-gray-100 shadow-inner">
             <div className="flex flex-col items-center gap-8 opacity-20">
                <Target size={80} className="text-gray-400 animate-bounce" />
                <div className="space-y-4">
                  <p className="text-xl font-black uppercase tracking-[0.4em] text-gray-900 italic">ZONA LIBRE DE INCIDENCIAS</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SISTEMA EN ESPERA DE NUEVAS DIRECTIVAS OPERACIONALES</p>
                </div>
             </div>
          </div>
        )}
      </div>

      <Drawer isOpen={mostrarForm} onClose={() => setMostrarForm(false)} title="NUEVA DIRECTIVA OPERACIONAL">
        <div className="p-4 space-y-10 select-none">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-400">
               <Activity size={16} />
               <label className="text-[10px] font-black uppercase tracking-[0.3em] italic">Descripción de la Tarea</label>
            </div>
            <textarea 
              value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
              className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[30px] text-xl font-black italic outline-none transition-all placeholder:text-gray-200 uppercase tracking-tight shadow-inner resize-none min-h-[160px]" 
              placeholder="DEFINA LOS PARÁMETROS AQUÍ..." 
            />
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-3 text-gray-400">
                <User size={16} />
                <label className="text-[10px] font-black uppercase tracking-[0.3em] italic">Operario Responsable</label>
             </div>
             <select 
               value={form.usuarioId} onChange={e => setForm({...form, usuarioId: e.target.value})}
               className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[24px] text-lg font-black outline-none transition-all uppercase italic tracking-tighter appearance-none cursor-pointer"
             >
               {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre.toUpperCase()}</option>)}
             </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic pl-1">Escala de Prioridad</label>
              <select 
                value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}
                className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[24px] text-lg font-black outline-none transition-all uppercase italic tracking-tighter text-red-600 appearance-none cursor-pointer"
              >
                <option value="BAJA">NORMAL / BAJA</option>
                <option value="MEDIA">ESTÁNDAR / MEDIA</option>
                <option value="ALTA">CRÍTICA / ALTA</option>
                <option value="URGENTE">INMEDIATA / URGENTE</option>
              </select>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic pl-1">Vencimiento Estimado</label>
              <input 
                type="date" value={form.vencimiento} onChange={e => setForm({...form, vencimiento: e.target.value})}
                className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-red-600 rounded-[24px] text-lg font-black italic outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="pt-10">
            <button
              onClick={crearTarea} disabled={!form.descripcion}
              className="w-full py-7 bg-red-600 text-white rounded-[32px] text-lg font-black hover:bg-red-700 disabled:opacity-50 transition-all shadow-2xl shadow-red-600/30 uppercase tracking-[0.4em] active:scale-95"
            >
              EMITIR DIRECTIVA
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
