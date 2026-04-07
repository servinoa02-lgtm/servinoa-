"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Wrench, User, Calendar, Briefcase, AlertTriangle, CheckSquare, Search } from "lucide-react";

interface Item { id: string; nombre: string; }
interface Cliente extends Item { empresa?: { nombre: string } | null; telefono?: string; }

function ComboBox({ label, value, onChange, opciones, placeholder, rows }: any) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtradas = opciones.filter((o: string) => o.toLowerCase().includes(value.toLowerCase()) && o !== value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 pl-1">{label}</label>
      {rows && rows > 1 ? (
        <textarea
          value={value} onChange={(e) => { onChange(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)}
          rows={rows} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-bold outline-none focus:border-red-600 transition-all uppercase italic tracking-tight placeholder:opacity-30" placeholder={placeholder}
        />
      ) : (
        <input
          type="text" value={value} onChange={(e) => { onChange(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)}
          className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-bold outline-none focus:border-red-600 transition-all uppercase italic tracking-tight placeholder:opacity-30" placeholder={placeholder}
        />
      )}
      {abierto && filtradas.length > 0 && (
        <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto overflow-hidden">
          {filtradas.map((o: string, i: number) => (
            <button key={i} onClick={() => { onChange(o); setAbierto(false); }} className="w-full text-left px-6 py-4 text-sm font-black uppercase tracking-widest hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NuevaOrdenPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tecnicos, setTecnicos] = useState<Item[]>([]);
  const [maquinas, setMaquinas] = useState<Item[]>([]);
  const [marcas, setMarcas] = useState<Item[]>([]);
  const [modelos, setModelos] = useState<Item[]>([]);
  const [fallasOpciones, setFallasOpciones] = useState<string[]>([]);
  
  const [accesoriosSugeridos, setAccesoriosSugeridos] = useState<string[]>([]);
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useState<string[]>([]);
  const [nuevoAccesorio, setNuevoAccesorio] = useState("");

  const [clienteId, setClienteId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [maquinaId, setMaquinaId] = useState("");
  const [maquinaNueva, setMaquinaNueva] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [marcaNueva, setMarcaNueva] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [modeloNuevo, setModeloNuevo] = useState("");
  const [falla, setFalla] = useState("");
  const [nroSerie, setNroSerie] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fechaEstimadaEntrega, setFechaEstimadaEntrega] = useState("");

  const [buscarCliente, setBuscarCliente] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
    fetch("/api/tecnicos").then((r) => r.json()).then(setTecnicos);
    fetch("/api/equipos").then((r) => r.json()).then((data) => {
      setMaquinas(data.maquinas);
      setMarcas(data.marcas);
      setModelos(data.modelos);
    });
    fetch("/api/sugerencias").then((r) => r.json()).then((data) => {
      setFallasOpciones(data.fallas);
      setAccesoriosSugeridos(data.accesorios);
    });
  }, []);

  const clientesFiltrados = buscarCliente
    ? clientes.filter((c) => {
        const texto = buscarCliente.toLowerCase();
        return c.nombre.toLowerCase().includes(texto) || c.empresa?.nombre?.toLowerCase().includes(texto);
      })
    : [];

  const toggleAccesorio = (acc: string) => {
    setAccesoriosSeleccionados(prev => 
      prev.includes(acc) ? prev.filter(x => x !== acc) : [...prev, acc]
    );
  };

  const agregarAccesorioManual = () => {
    if (nuevoAccesorio.trim() && !accesoriosSeleccionados.includes(nuevoAccesorio.trim())) {
      setAccesoriosSeleccionados([...accesoriosSeleccionados, nuevoAccesorio.trim()]);
      setNuevoAccesorio("");
    }
  };

  const handleSubmit = async () => {
    if (!clienteId || (!maquinaId && !maquinaNueva)) {
      setError("CLIENTE Y TIPO DE MÁQUINA SON REQUISITOS OBLIGATORIOS");
      return;
    }
    setGuardando(true);
    setError("");

    const res = await fetch("/api/ordenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        creadorId: (session?.user as any)?.id,
        tecnicoId: tecnicoId || null,
        maquinaId: maquinaId || null,
        maquinaNueva: !maquinaId ? maquinaNueva : null,
        marcaId: marcaId || null,
        marcaNueva: !marcaId ? marcaNueva : null,
        modeloId: modeloId || null,
        modeloNuevo: !modeloId ? modeloNuevo : null,
        falla,
        accesorios: accesoriosSeleccionados.length > 0 ? accesoriosSeleccionados.join(", ") : "Sin accesorios",
        nroSerie,
        observaciones,
        fechaEstimadaEntrega: fechaEstimadaEntrega || null
      }),
    });

    if (res.ok) router.push("/ordenes");
    else setError("ERROR ESTRUCTURAL AL GENERAR LA OT");
    
    setGuardando(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
        Inicializando Protocolo de Alta...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans animate-in fade-in duration-500">
      
      {/* Header Industrial */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/ordenes" className="p-3 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-gray-400 mb-1">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-70">Operaciones</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">REGISTRO DE INGRESO</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic uppercase">Nueva Orden de Trabajo</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full space-y-10">
        <div className="bg-white rounded-[40px] shadow-2xl border-2 border-gray-100 overflow-hidden">
          
          <div className="p-10 lg:p-16 space-y-12">

            {/* SECCIÓN 1: VINCULACIÓN DE CLIENTE */}
            <section className="space-y-8">
              <div className="flex items-center gap-4 border-b-2 border-gray-100 pb-6">
                 <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                    <User size={24} />
                 </div>
                 <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Entidad Titular del Equipo</h2>
              </div>
              
              <div className="relative">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3 pl-1">BUSCADOR MAESTRO DE CLIENTES</label>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" placeholder="DNI, NOMBRE O RAZÓN SOCIAL..." value={buscarCliente} onChange={e => setBuscarCliente(e.target.value)} 
                         className="w-full pl-16 pr-6 py-6 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-black outline-none focus:border-red-600 transition-all uppercase italic tracking-tight shadow-inner" />
                </div>
                {buscarCliente && clientesFiltrados.length > 0 && (
                  <div className="absolute top-full mt-3 w-full z-20 bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-2xl max-h-80 overflow-y-auto">
                    {clientesFiltrados.map((c) => (
                      <button key={c.id} onClick={() => { setClienteId(c.id); setBuscarCliente(c.empresa ? `${c.empresa.nombre.toUpperCase()} - ${c.nombre.toUpperCase()}` : c.nombre.toUpperCase()); }}
                              className={`w-full text-left px-8 py-5 text-sm font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-700 border-b border-gray-50 transition-colors ${clienteId === c.id ? "bg-red-50 text-red-700" : "text-gray-900"}`}>
                        {c.empresa ? `${c.empresa.nombre} - ${c.nombre}` : c.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* SECCIÓN 2: ESPECIFICACIONES TÉCNICAS */}
            <section className="space-y-8 pt-6">
              <div className="flex items-center gap-4 border-b-2 border-gray-100 pb-6">
                 <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-gray-900/30">
                    <Wrench size={24} />
                 </div>
                 <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Detalle Estructural de la Unidad</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 pl-1">CATEGORÍA/TIPO</label>
                   <select value={maquinaId} onChange={e => setMaquinaId(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-black outline-none focus:border-red-600 transition-all uppercase italic tracking-tighter">
                     <option value="">-- NUEVO TIPO --</option>
                     {maquinas.map(m => <option key={m.id} value={m.id}>{m.nombre.toUpperCase()}</option>)}
                   </select>
                   {!maquinaId && <input type="text" placeholder="ESPECIFICAR TIPO..." value={maquinaNueva} onChange={e => setMaquinaNueva(e.target.value)} className="w-full px-6 py-4 bg-white border-2 border-red-100 rounded-2xl text-sm font-bold mt-2 uppercase italic outline-none focus:border-red-600" />}
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 pl-1">MARCA FABRICANTE</label>
                   <select value={marcaId} onChange={e => setMarcaId(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-black outline-none focus:border-red-600 transition-all uppercase italic tracking-tighter">
                     <option value="">-- NUEVA MARCA --</option>
                     {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre.toUpperCase()}</option>)}
                   </select>
                   {!marcaId && <input type="text" placeholder="ESPECIFICAR MARCA..." value={marcaNueva} onChange={e => setMarcaNueva(e.target.value)} className="w-full px-6 py-4 bg-white border-2 border-red-100 rounded-2xl text-sm font-bold mt-2 uppercase italic outline-none focus:border-red-600" />}
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 pl-1">MODELO TÉCNICO</label>
                   <select value={modeloId} onChange={e => setModeloId(e.target.value)} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-black outline-none focus:border-red-600 transition-all uppercase italic tracking-tighter">
                     <option value="">-- NUEVO MODELO --</option>
                     {modelos.map(m => <option key={m.id} value={m.id}>{m.nombre.toUpperCase()}</option>)}
                   </select>
                   {!modeloId && <input type="text" placeholder="ESPECIFICAR MODELO..." value={modeloNuevo} onChange={e => setModeloNuevo(e.target.value)} className="w-full px-6 py-4 bg-white border-2 border-red-100 rounded-2xl text-sm font-bold mt-2 uppercase italic outline-none focus:border-red-600" />}
                </div>
              </div>
              
              <div className="p-8 bg-gray-900 border-2 border-gray-800 rounded-3xl shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CheckSquare size={64} className="text-white" />
                 </div>
                 <label className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] block mb-4 text-center">IDENTIFICACIÓN DE SERIE / PATENTE</label>
                 <input type="text" value={nroSerie} onChange={e => setNroSerie(e.target.value)} placeholder="# S/N — #########" 
                        className="w-full bg-transparent border-b-4 border-gray-700 p-4 text-center text-3xl font-mono font-black text-white outline-none focus:border-red-600 transition-all placeholder:opacity-20 uppercase tracking-widest italic" />
              </div>
            </section>

            {/* SECCIÓN 3: REPORTE DE INGRESO */}
            <section className="space-y-10 pt-6">
               <div className="flex items-center gap-4 border-b-2 border-gray-100 pb-6">
                 <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                    <Briefcase size={24} />
                 </div>
                 <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Protocolo de Falla e Inventario</h2>
              </div>

               <ComboBox label="SÍNTOMAS Y REPORTE DE FALLA *" value={falla} onChange={setFalla} opciones={fallasOpciones} placeholder="DESCRIBA LOS SÍNTOMAS TÉCNICOS..." rows={3} />

               <div className="bg-gray-50 border-2 border-gray-100 p-8 lg:p-10 rounded-[32px] space-y-8">
                 <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em]">INVENTARIO DE ACCESORIOS RECIBIDOS</label>
                    <span className="bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{accesoriosSeleccionados.length} ITEM(S)</span>
                 </div>
                 
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                   {["Batería", "Cargador", "Manual", "Cables", "Funda / Bolso", "Memoria SD"].map(acc => (
                     <label key={acc} onClick={() => toggleAccesorio(acc)} className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${accesoriosSeleccionados.includes(acc) ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/30" : "bg-white border-gray-100 text-gray-500 hover:border-red-600"}`}>
                       <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${accesoriosSeleccionados.includes(acc) ? "bg-white/20" : "bg-gray-100 group-hover:bg-red-50"}`}>
                          <CheckSquare size={14} className={accesoriosSeleccionados.includes(acc) ? "text-white" : "text-gray-300"} />
                       </div>
                       <span className="text-xs font-black uppercase tracking-widest">{acc}</span>
                     </label>
                   ))}
                   {accesoriosSeleccionados.filter(a => !["Batería", "Cargador", "Manual", "Cables", "Funda / Bolso", "Memoria SD"].includes(a)).map(acc => (
                     <label key={acc} onClick={() => toggleAccesorio(acc)} className="flex items-center gap-4 px-6 py-4 rounded-2xl border-2 bg-gray-900 border-gray-800 text-white shadow-lg cursor-pointer">
                        <CheckSquare size={14} className="text-red-600" />
                        <span className="text-xs font-black uppercase tracking-widest">{acc}</span>
                     </label>
                   ))}
                 </div>
                 
                 <div className="flex flex-col sm:flex-row gap-4 mt-8">
                   <input type="text" value={nuevoAccesorio} onChange={e => setNuevoAccesorio(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregarAccesorioManual()}
                          className="flex-1 px-8 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-black italic outline-none focus:border-red-600 transition-all uppercase shadow-inner" placeholder="OTRO ELEMENTO..." />
                   <button type="button" onClick={agregarAccesorioManual} className="bg-gray-900 text-white px-8 py-5 rounded-2xl text-xs font-black hover:bg-black transition-all uppercase tracking-widest">AÑADIR</button>
                 </div>
               </div>
            </section>

            {/* SECCIÓN 4: LOGÍSTICA INTERNA */}
            <section className="space-y-8 pt-6 border-t-2 border-gray-100">
               <div className="flex items-center gap-4 border-b-2 border-gray-100 pb-6">
                 <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                    <Calendar size={24} />
                 </div>
                 <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Logística y Plazos Operativos</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">PRE-ASIGNACIÓN TÉCNICA</label>
                   <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-black outline-none focus:border-red-600 transition-all uppercase italic tracking-tighter">
                     <option value="">A DESIGNAR POSTERIORMENTE</option>
                     {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre.toUpperCase()}</option>)}
                   </select>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">PROMESA DE ENTREGA (ESTIMADA)</label>
                   <input type="date" value={fechaEstimadaEntrega} onChange={e => setFechaEstimadaEntrega(e.target.value)} className="w-full px-8 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-black outline-none focus:border-red-600 transition-all shadow-inner" />
                </div>
              </div>

              <div className="pt-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 pl-1">OBSERVACIONES RESERVADAS (SOLO ADMINISTRACIÓN)</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} className="w-full px-8 py-6 bg-red-50 border-2 border-red-100 rounded-3xl text-sm font-black text-red-900 italic outline-none focus:border-red-600 transition-all shadow-inner placeholder:text-red-300" placeholder="NOTAS INTERNAS DE SEGURIDAD O GESTIÓN..." />
              </div>
            </section>

          </div>

          <div className="px-10 lg:px-16 py-12 bg-gray-50 border-t-2 border-gray-100 flex flex-col items-center">
            {error && <div className="w-full mb-8 bg-red-600 text-white px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-4 animate-in fade-in zoom-in duration-300"><AlertTriangle size={24}/> {error}</div>}
            
            <button onClick={handleSubmit} disabled={guardando} className="w-full max-w-2xl py-8 bg-red-600 text-white rounded-[32px] text-xl font-black hover:bg-red-700 shadow-2xl shadow-red-600/40 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.2em] flex items-center justify-center gap-6">
              {guardando ? (
                <>
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  PROCESANDO CERTIFICADO ALTA...
                </>
              ) : (
                <>
                  <Save size={28} /> GENERAR ORDEN Y GUARDAR
                </>
              )}
            </button>
            <p className="mt-8 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] italic text-center leading-relaxed">SISTEMA DE GESTIÓN INDUSTRIAL — SERVINOA V3.0<br/>VÍNCULO LEGAL Y TECNOLÓGICO INDISOLUBLE</p>
          </div>
        </div>
      </main>
    </div>
  );
}