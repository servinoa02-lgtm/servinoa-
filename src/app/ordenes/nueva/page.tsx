"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Wrench, User, Calendar, Briefcase, AlertTriangle, Search, X } from "lucide-react";
import { formatoService } from "@/services/formatoService";

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
          value={value} onChange={(e) => { onChange(formatoService.capitalizarPrimeraLetra(e.target.value)); setAbierto(true); }} onFocus={() => setAbierto(true)}
          rows={rows} className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-bold outline-none focus:border-red-600 transition-all italic tracking-tight placeholder:opacity-30" placeholder={placeholder}
        />
      ) : (
        <input
          type="text" value={value} onChange={(e) => { onChange(formatoService.capitalizarPrimeraLetra(e.target.value)); setAbierto(true); }} onFocus={() => setAbierto(true)}
          className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-base font-bold outline-none focus:border-red-600 transition-all italic tracking-tight placeholder:opacity-30" placeholder={placeholder}
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
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoEmpresa, setNuevoEmpresa] = useState("");
  const [esEmpresa, setEsEmpresa] = useState(false);
  const [nuevoCuit, setNuevoCuit] = useState("");
  const [nuevoDni, setNuevoDni] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoDomicilio, setNuevoDomicilio] = useState("");
  const [nuevoIva, setNuevoIva] = useState("NO incluyen IVA");
  const [creandoCliente, setCreandoCliente] = useState(false);

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
    });
  }, []);

  const clientesFiltrados = buscarCliente && !clienteId
    ? clientes.filter((c) => {
        const texto = buscarCliente.toLowerCase();
        return c.nombre.toLowerCase().includes(texto) || c.empresa?.nombre?.toLowerCase().includes(texto);
      })
    : [];

  const agregarAccesorio = () => {
    const acc = nuevoAccesorio.trim().toUpperCase();
    if (acc && !accesoriosSeleccionados.includes(acc)) {
      setAccesoriosSeleccionados(prev => [...prev, acc]);
      setNuevoAccesorio("");
    }
  };

  const quitarAccesorio = (acc: string) => {
    setAccesoriosSeleccionados(prev => prev.filter(a => a !== acc));
  };

  const handleCrearClienteOT = async () => {
    if (!nuevoNombre.trim()) return;
    setCreandoCliente(true);
    const empresaNombre = esEmpresa && nuevoEmpresa.trim()
      ? formatoService.capitalizarPalabras(nuevoEmpresa.trim())
      : null;
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: formatoService.capitalizarPalabras(nuevoNombre.trim()),
        telefono: nuevoTelefono || null,
        empresaNombre,
        cuit: nuevoCuit || null,
        dni: nuevoDni || null,
        email: nuevoEmail || null,
        domicilio: nuevoDomicilio || null,
        iva: nuevoIva,
      }),
    });
    if (res.ok) {
      const cliente = await res.json();
      setClientes(prev => [...prev, cliente]);
      setClienteId(cliente.id);
      const label = empresaNombre
        ? `${empresaNombre} — ${nuevoNombre.trim().toUpperCase()}`
        : nuevoNombre.trim().toUpperCase();
      setBuscarCliente(label);
      setMostrarNuevoCliente(false);
      setNuevoNombre(""); setNuevoTelefono(""); setNuevoEmpresa(""); setEsEmpresa(false);
      setNuevoCuit(""); setNuevoDni(""); setNuevoEmail(""); setNuevoDomicilio(""); setNuevoIva("NO incluyen IVA");
    }
    setCreandoCliente(false);
  };

  const handleSubmit = async () => {
    if (!clienteId || (!maquinaId && !maquinaNueva)) {
      setError("CLIENTE Y TIPO DE MÁQUINA SON OBLIGATORIOS");
      return;
    }
    setGuardando(true);
    setError("");

    const accFinal = nuevoAccesorio.trim().toUpperCase();
    let accesoriosGuardar = [...accesoriosSeleccionados];
    if (accFinal && !accesoriosGuardar.includes(accFinal)) {
       accesoriosGuardar.push(accFinal);
    }

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
        accesorios: accesoriosGuardar.length > 0 ? accesoriosGuardar.join(", ") : "Sin accesorios",
        nroSerie,
        observaciones,
        fechaEstimadaEntrega: fechaEstimadaEntrega || null
      }),
    });

    if (res.ok) router.push("/ordenes");
    else setError("ERROR AL CREAR LA ORDEN DE TRABAJO");

    setGuardando(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-gray-400 animate-pulse font-bold uppercase tracking-widest">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 h-20 flex items-center gap-6">
          <Link href="/ordenes" className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Taller</p>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nueva Orden de Trabajo</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-bold flex items-center gap-3">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {/* SECCIÓN 1: CLIENTE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-3">
              <User size={16} className="text-red-600" /> Cliente
            </h2>
            <button
              type="button"
              onClick={() => { setMostrarNuevoCliente(!mostrarNuevoCliente); setClienteId(""); setBuscarCliente(""); }}
              className="text-xs font-bold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> {mostrarNuevoCliente ? "Buscar existente" : "Nuevo cliente"}
            </button>
          </div>

          <div className="p-8">
            {mostrarNuevoCliente ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Empresa */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Empresa</label>
                    <div className="flex gap-3">
                      <select
                        value={esEmpresa ? "empresa" : "particular"}
                        onChange={e => { setEsEmpresa(e.target.value === "empresa"); setNuevoEmpresa(""); }}
                        className="px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all"
                      >
                        <option value="particular">Particular</option>
                        <option value="empresa">Empresa</option>
                      </select>
                      {esEmpresa && (
                        <input type="text" value={nuevoEmpresa} onChange={e => setNuevoEmpresa(formatoService.capitalizarPalabras(e.target.value))}
                               placeholder="Nombre de la empresa"
                               className="flex-1 px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                      )}
                    </div>
                  </div>

                  {/* Nombre */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Nombre / Cliente *</label>
                    <input type="text" value={nuevoNombre} onChange={e => setNuevoNombre(formatoService.capitalizarPalabras(e.target.value))}
                           className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>

                  {/* CUIT */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">CUIT</label>
                    <input type="text" value={nuevoCuit} onChange={e => setNuevoCuit(e.target.value)}
                           placeholder="XX-XXXXXXXX-X"
                           className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>

                  {/* DNI */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">DNI</label>
                    <input type="text" value={nuevoDni} onChange={e => setNuevoDni(e.target.value)}
                           placeholder="XXXXXXXX"
                           className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>

                  {/* Mail */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Mail</label>
                    <input type="email" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)}
                           placeholder="correo@ejemplo.com"
                           className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Teléfono *</label>
                    <input type="text" value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)}
                           placeholder="XXXX-XXXXXXX"
                           className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>

                  {/* Domicilio */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Domicilio</label>
                    <input type="text" value={nuevoDomicilio} onChange={e => setNuevoDomicilio(formatoService.capitalizarPrimeraLetra(e.target.value))}
                           placeholder="Calle, número, localidad"
                           className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
                  </div>

                  {/* IVA */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">IVA</label>
                    <select value={nuevoIva} onChange={e => setNuevoIva(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all">
                      <option value="NO incluyen IVA">NO incluyen IVA</option>
                      <option value="Incluyen IVA">Incluyen IVA</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={handleCrearClienteOT} disabled={!nuevoNombre.trim() || creandoCliente}
                          className="bg-red-600 text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 uppercase tracking-wide flex items-center gap-2">
                    {creandoCliente ? "Creando..." : "Crear y seleccionar cliente"}
                  </button>
                  <button type="button" onClick={() => setMostrarNuevoCliente(false)}
                          className="text-gray-400 hover:text-gray-700 px-4 py-3.5 rounded-xl text-sm font-bold transition-all uppercase">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text" placeholder="Buscar por nombre o empresa..." value={buscarCliente}
                    onChange={e => { setBuscarCliente(e.target.value); setClienteId(""); }}
                    className="w-full pl-14 pr-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all"
                  />
                </div>
                {clientesFiltrados.length > 0 && (
                  <div className="absolute top-full mt-2 w-full z-20 bg-white border-2 border-gray-100 rounded-2xl shadow-xl max-h-72 overflow-y-auto">
                    {clientesFiltrados.map((c) => (
                      <button key={c.id}
                        onClick={() => {
                          setClienteId(c.id);
                          setBuscarCliente(c.empresa?.nombre ? `${c.empresa.nombre.toUpperCase()} — ${c.nombre.toUpperCase()}` : c.nombre.toUpperCase());
                        }}
                        className="w-full text-left px-6 py-4 text-sm font-bold uppercase hover:bg-red-50 hover:text-red-700 border-b border-gray-50 last:border-0 transition-colors"
                      >
                        {c.empresa?.nombre ? `${c.empresa.nombre.toUpperCase()} — ${c.nombre.toUpperCase()}` : c.nombre.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
                {clienteId && (
                  <div className="mt-3 flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-sm font-bold text-emerald-700 uppercase">{buscarCliente}</span>
                    <button type="button" onClick={() => { setClienteId(""); setBuscarCliente(""); }}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-600 underline uppercase ml-4">
                      Cambiar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECCIÓN 2: EQUIPO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-3">
              <Wrench size={16} className="text-red-600" /> Equipo
            </h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Tipo</label>
                <select value={maquinaId} onChange={e => setMaquinaId(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all uppercase">
                  <option value="">-- Nuevo tipo --</option>
                  {maquinas.map(m => <option key={m.id} value={m.id}>{m.nombre.toUpperCase()}</option>)}
                </select>
                {!maquinaId && (
                  <input type="text" placeholder="Especificar tipo..." value={maquinaNueva} onChange={e => setMaquinaNueva(formatoService.capitalizarPrimeraLetra(e.target.value))}
                         className="w-full mt-2 px-5 py-3 bg-white border-2 border-red-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600" />
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Marca</label>
                <select value={marcaId} onChange={e => setMarcaId(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all uppercase">
                  <option value="">-- Nueva marca --</option>
                  {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre.toUpperCase()}</option>)}
                </select>
                {!marcaId && (
                  <input type="text" placeholder="Especificar marca..." value={marcaNueva} onChange={e => setMarcaNueva(formatoService.capitalizarPrimeraLetra(e.target.value))}
                         className="w-full mt-2 px-5 py-3 bg-white border-2 border-red-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600" />
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Modelo</label>
                <select value={modeloId} onChange={e => setModeloId(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all uppercase">
                  <option value="">-- Nuevo modelo --</option>
                  {modelos.map(m => <option key={m.id} value={m.id}>{m.nombre.toUpperCase()}</option>)}
                </select>
                {!modeloId && (
                  <input type="text" placeholder="Especificar modelo..." value={modeloNuevo} onChange={e => setModeloNuevo(formatoService.capitalizarPrimeraLetra(e.target.value))}
                         className="w-full mt-2 px-5 py-3 bg-white border-2 border-red-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600" />
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Número de serie</label>
              <input type="text" value={nroSerie} onChange={e => setNroSerie(e.target.value.toUpperCase())} placeholder="Ej: SN-12345678"
                     className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all uppercase" />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: FALLA E INVENTARIO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-3">
              <Briefcase size={16} className="text-red-600" /> Falla e Inventario de Accesorios
            </h2>
          </div>
          <div className="p-8 space-y-8">
            <ComboBox
              label="Falla comentada por el cliente"
              value={falla}
              onChange={setFalla}
              opciones={fallasOpciones}
              placeholder="Describa el problema reportado..."
              rows={3}
            />

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Inventario de accesorios recibidos</label>

              {accesoriosSeleccionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {accesoriosSeleccionados.map((acc) => (
                    <span key={acc} className="flex items-center gap-2 bg-gray-100 text-gray-800 text-xs font-bold px-4 py-2 rounded-xl uppercase">
                      {acc}
                      <button type="button" onClick={() => quitarAccesorio(acc)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {accesoriosSeleccionados.length === 0 && (
                <p className="text-xs text-gray-400 italic mb-4">Sin accesorios agregados.</p>
              )}

              <div className="flex gap-3">
                <input
                  type="text" value={nuevoAccesorio} onChange={e => setNuevoAccesorio(formatoService.capitalizarPrimeraLetra(e.target.value))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregarAccesorio(); } }}
                  placeholder="Ej: Cargador, Cable HDMI, Batería..."
                  className="flex-1 px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all"
                />
                <button type="button" onClick={agregarAccesorio}
                        className="bg-red-600 text-white px-6 py-3.5 rounded-2xl text-xs font-bold hover:bg-red-700 transition-all uppercase tracking-wide">
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: LOGÍSTICA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-3">
              <Calendar size={16} className="text-red-600" /> Asignación y Plazos
            </h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Técnico asignado</label>
                <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all uppercase">
                  <option value="">A designar posteriormente</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Fecha estimada de entrega</label>
                <input type="date" value={fechaEstimadaEntrega} onChange={e => setFechaEstimadaEntrega(e.target.value)}
                       className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Observaciones internas</label>
              <textarea value={observaciones} onChange={e => setObservaciones(formatoService.capitalizarPrimeraLetra(e.target.value))} rows={3}
                        placeholder="Notas internas del equipo..."
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-red-600 transition-all resize-none" />
            </div>
          </div>
        </div>

        {/* BOTÓN */}
        <div className="pb-6">
          <button
            onClick={handleSubmit} disabled={guardando}
            className="w-full bg-red-600 text-white py-4 rounded-2xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20 uppercase tracking-wide flex items-center justify-center gap-3 active:scale-[0.99]"
          >
            <Save size={18} /> {guardando ? "Guardando..." : "Generar OT"}
          </button>
        </div>

      </main>
    </div>
  );
}
