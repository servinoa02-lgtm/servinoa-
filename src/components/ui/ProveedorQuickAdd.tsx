"use client";

import { useState } from "react";
import { Plus, X, Save, Building2 } from "lucide-react";

interface Proveedor {
  id: string;
  nombre: string;
  empresa?: string | null;
  domicilio?: string | null;
  telefono?: string | null;
  rubro?: string | null;
}

interface Props {
  value: string;
  proveedores: Proveedor[];
  onChange: (id: string) => void;
  onCreated: (p: Proveedor) => void;
}

const inputCls =
  "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-600 focus:bg-white transition-all";

export function ProveedorQuickAdd({ value, proveedores, onChange, onCreated }: Props) {
  const [modo, setModo] = useState<"select" | "nuevo">("select");
  const [nombre, setNombre] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rubro, setRubro] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setNombre(""); setDomicilio(""); setTelefono(""); setRubro("");
    setError(""); setGuardando(false); setModo("select");
  };

  const guardar = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setGuardando(true); setError("");
    const res = await fetch("/api/proveedores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre.trim().toUpperCase(),
        domicilio: domicilio.trim().toUpperCase() || null,
        telefono: telefono.trim() || null,
        rubro: rubro.trim().toUpperCase() || null,
      }),
    });
    if (res.ok) {
      const nuevo: Proveedor = await res.json();
      onCreated(nuevo);
      onChange(nuevo.id);
      reset();
    } else {
      setError("Error al guardar el proveedor");
    }
    setGuardando(false);
  };

  if (modo === "nuevo") {
    return (
      <div className="border border-red-200 rounded-xl overflow-hidden bg-red-50/30">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-red-100">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-red-600" />
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Nuevo proveedor</span>
          </div>
          <button onClick={reset} className="p-1 text-gray-400 hover:text-red-600 rounded-lg transition-all">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {error && (
            <p className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre / Empresa *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: FERRETERÍA EL TORNILLO"
              className={inputCls + " uppercase"}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Rubro</label>
            <input
              type="text"
              value={rubro}
              onChange={e => setRubro(e.target.value)}
              placeholder="Ej: Ferretería, Electricidad, Transporte..."
              className={inputCls + " uppercase"}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Dirección</label>
            <input
              type="text"
              value={domicilio}
              onChange={e => setDomicilio(e.target.value)}
              placeholder="Calle y número, ciudad..."
              className={inputCls + " uppercase"}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="0387-XXXXXXX"
              className={inputCls}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              <Save size={13} /> {guardando ? "Guardando..." : "Guardar proveedor"}
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-600 focus:bg-white transition-all appearance-none cursor-pointer"
        >
          <option value="">Sin proveedor asociado</option>
          {proveedores.map(p => (
            <option key={p.id} value={p.id}>
              {p.nombre}{p.rubro ? ` · ${p.rubro}` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setModo("nuevo")}
          title="Agregar nuevo proveedor"
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border border-dashed border-gray-300 text-gray-400 rounded-xl text-xs font-bold hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>
      {value && (() => {
        const p = proveedores.find(x => x.id === value);
        if (!p) return null;
        return (
          <div className="flex flex-wrap gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
            {p.rubro && <span className="text-[10px] font-bold text-gray-500 uppercase">{p.rubro}</span>}
            {p.domicilio && <span className="text-[10px] text-gray-400 uppercase">{p.domicilio}</span>}
            {p.telefono && <span className="text-[10px] text-gray-400">{p.telefono}</span>}
          </div>
        );
      })()}
    </div>
  );
}
