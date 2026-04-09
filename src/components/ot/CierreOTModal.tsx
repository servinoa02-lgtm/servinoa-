"use client";

import { useEffect, useRef, useState } from "react";
import { X, Eraser, PenLine, ShieldCheck, AlertTriangle } from "lucide-react";
import { formatEstado } from "@/lib/estados";

interface CierreOTModalProps {
  isOpen: boolean;
  destino: "ENTREGADO_REALIZADO" | "ENTREGADO_SIN_REALIZAR" | null;
  ordenNumero?: number;
  onCancel: () => void;
  onConfirm: (data: { nombre: string; dni: string; firma: string }) => Promise<void> | void;
}

const MAX_FIRMA_BYTES = 500 * 1024; // 500 KB

export function CierreOTModal({
  isOpen,
  destino,
  ordenNumero,
  onCancel,
  onConfirm,
}: CierreOTModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasStrokeRef = useRef(false);

  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [firmaTouched, setFirmaTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al abrir / cerrar
  useEffect(() => {
    if (isOpen) {
      setNombre("");
      setDni("");
      setFirmaTouched(false);
      setError(null);
      setSubmitting(false);
      hasStrokeRef.current = false;
      // limpiar canvas en el próximo tick (cuando ya esté montado)
      requestAnimationFrame(() => clearCanvas());
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel, submitting]);

  // Inicializar canvas con DPI correcto
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, [isOpen]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = getPos(e);
    const last = lastPointRef.current ?? point;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      setFirmaTouched(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    hasStrokeRef.current = false;
    setFirmaTouched(false);
  };

  const dniValido = /^[0-9]{7,9}$/.test(dni.trim());
  const nombreValido = nombre.trim().length >= 3;
  const puedeConfirmar = nombreValido && dniValido && firmaTouched && !submitting;

  const handleConfirm = async () => {
    setError(null);
    if (!puedeConfirmar) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    // Estimación de tamaño: cada 4 chars base64 ≈ 3 bytes
    const base64 = dataUrl.split(",")[1] ?? "";
    const sizeBytes = Math.floor((base64.length * 3) / 4);
    if (sizeBytes > MAX_FIRMA_BYTES) {
      setError("La firma supera el tamaño permitido (500 KB). Limpie y vuelva a firmar más simple.");
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm({
        nombre: nombre.trim().toUpperCase(),
        dni: dni.trim(),
        firma: dataUrl,
      });
    } catch (err: any) {
      setError(err?.message || "No se pudo confirmar el cierre.");
      setSubmitting(false);
    }
  };

  if (!isOpen || !destino) return null;

  const esRealizado = destino === "ENTREGADO_REALIZADO";
  const headerColor = esRealizado ? "from-emerald-600 to-emerald-500" : "from-orange-600 to-orange-500";
  const canvasBorderActivo = esRealizado ? "border-emerald-400" : "border-orange-400";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !submitting && onCancel()}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className={`bg-gradient-to-r ${headerColor} px-8 py-6 text-white relative`}>
          <button
            onClick={() => !submitting && onCancel()}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/20 transition-all"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                Constancia de retiro {ordenNumero ? `· OT #${ordenNumero}` : ""}
              </p>
              <h2 className="text-xl font-bold tracking-tight">
                Cierre como {formatEstado(destino)}
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          <p className="text-xs text-gray-500 leading-relaxed">
            Complete los datos de la persona que retira el equipo y solicite su firma.
            Una vez confirmado, la orden cambiará automáticamente al estado seleccionado.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                Nombre y Apellido
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                placeholder="JUAN PÉREZ"
                disabled={submitting}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold uppercase tracking-tight outline-none focus:border-gray-900 focus:bg-white transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                DNI <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="40123456"
                disabled={submitting}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono outline-none focus:border-gray-900 focus:bg-white transition-all disabled:opacity-50"
              />
              {dni.length > 0 && !dniValido && (
                <p className="text-[10px] text-red-600 font-bold mt-1 uppercase">DNI inválido (7-9 dígitos)</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <PenLine size={12} /> Firma del receptor
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                disabled={submitting}
                className="text-[10px] font-bold text-gray-500 hover:text-red-600 uppercase flex items-center gap-1 transition-all disabled:opacity-50"
              >
                <Eraser size={12} /> Limpiar
              </button>
            </div>
            <div className={`relative rounded-2xl border-2 border-dashed ${firmaTouched ? canvasBorderActivo : "border-gray-200"} bg-white overflow-hidden transition-all`}>
              <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "180px", touchAction: "none" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="block cursor-crosshair"
              />
              {!firmaTouched && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                    Firme dentro del recuadro
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-4">
          <button
            onClick={() => !submitting && onCancel()}
            disabled={submitting}
            className="px-5 py-3 text-[10px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl uppercase tracking-widest transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!puedeConfirmar}
            className={`px-6 py-3 text-[10px] font-bold text-white rounded-xl uppercase tracking-widest transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
              esRealizado
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            {submitting ? "Procesando..." : `Confirmar ${formatEstado(destino)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
