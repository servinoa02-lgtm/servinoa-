"use client";

import { useState } from "react";
import { Save } from "lucide-react";

export function GlobalNoteForm({ initialNote }: { initialNote: string }) {
  const [nota, setNota] = useState(initialNote);
  const [guardando, setGuardando] = useState(false);

  const guardarConfig = async () => {
    setGuardando(true);
    try {
      await fetch("/api/dashboard/nota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota }),
      });
    } catch (e) {
      console.error(e);
    }
    setGuardando(false);
  };

  return (
    <div className="flex-1 p-4 flex flex-col gap-3">
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        className="w-full h-full flex-1 resize-none bg-white border border-indigo-100 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder="Escribe un anuncio o recordatorio grupal aquí..."
      />
      <div className="flex justify-end">
        <button
          onClick={guardarConfig}
          disabled={guardando}
          className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-200 transition-colors"
        >
          {guardando ? (
            <span className="animate-pulse">Guardando...</span>
          ) : (
            <>
              <Save size={16} /> Grabar Aviso
            </>
          )}
        </button>
      </div>
    </div>
  );
}
