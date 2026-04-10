"use client";

import { useState } from "react";
import { Save, AlertCircle } from "lucide-react";
import { formatoService } from "@/services/formatoService";

export function GlobalNoteForm({ initialNote }: { initialNote: string }) {
  const [nota, setNota] = useState(initialNote);
  const [guardando, setGuardando] = useState(false);

  const guardarConfig = async () => {
    setGuardando(true);
    try {
      await fetch("/api/dashboard/nota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: formatoService.capitalizarPrimeraLetra(nota) }),
      });
    } catch (e) {
      console.error(e);
    }
    setGuardando(false);
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
         <AlertCircle size={14} />
         <span className="text-[10px] font-bold uppercase tracking-widest">Aviso General de Taller</span>
      </div>
      <textarea
        value={nota}
        onChange={(e) => setNota(formatoService.capitalizarPrimeraLetra(e.target.value))}
        className="w-full h-32 resize-none bg-white border border-gray-200 rounded-xl p-4 text-sm font-medium text-gray-900 outline-none focus:border-red-600 transition-all placeholder:text-gray-300"
        placeholder="Escriba un anuncio o recordatorio..."
      />
      <div className="flex justify-end">
        <button
          onClick={guardarConfig}
          disabled={guardando}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-600/10 active:scale-[0.98] disabled:opacity-50"
        >
          {guardando ? (
            <span className="animate-pulse">Guardando...</span>
          ) : (
            <>
              <Save size={16} /> Publicar Aviso
            </>
          )}
        </button>
      </div>
    </div>
  );
}
