"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatFecha } from "@/lib/dateUtils";
import { ArrowLeft, Printer } from "lucide-react";
import { formatMoney, formatNumeroPresupuesto, IVA_RATE } from "@/lib/constants";

export default function PresupuestoImprimirPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ppto, setPpto] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (id) {
      fetch(`/api/presupuestos/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setPpto(data);
          setLoading(false);
          // Auto-lanzar visor
          setTimeout(() => window.print(), 800);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-1 bg-red-600 rounded-full animate-pulse mb-4" />
        <div className="text-gray-400 font-medium text-sm animate-pulse">Generando documento...</div>
      </div>
    );
  }

  if (!ppto || ppto.error) return <div className="p-20 text-center">Presupuesto no encontrado</div>;

  const equipoStr = ppto.orden 
    ? [ppto.orden.maquina?.nombre, ppto.orden.marca?.nombre, ppto.orden.modelo?.nombre].filter(Boolean).join(" - ") 
    : null;

  return (
    <div className="min-h-screen bg-gray-200 py-10 print:bg-white print:py-0 font-sans">
      <div className="max-w-4xl mx-auto px-4 print:px-0 flex justify-between items-center mb-6 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm font-bold">
          <ArrowLeft size={16} /> Volver
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 px-6 py-2.5 rounded-xl shadow-md font-bold uppercase tracking-widest transition-all">
          <Printer size={18} /> Imprimir Presupuesto
        </button>
      </div>
      
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl shadow-black/5 print:shadow-none p-12 print:p-0 min-h-[297mm] flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div className="flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ServiNOA" className="h-12 w-auto object-contain mb-3" onError={(e) => e.currentTarget.style.display = 'none'} />
              <h1 className="text-2xl font-bold uppercase tracking-widest text-black">Presupuesto</h1>
              <p className="text-xl font-black mt-1">N° {formatNumeroPresupuesto(ppto.numero, ppto.fecha)}</p>
            </div>
            <div className="text-right text-[11px] leading-tight mt-2">
              <p className="font-black text-lg mb-1 uppercase">BAUGAL SRL</p>
              <p>CUIT: 30-71885628-7</p>
              <p>Responsable Inscripto</p>
              <p>Act. Económicas: 30-71885628-7</p>
              <p>Buenos Aires 1287 - Salta</p>
              <p>Cel: 387-2239277</p>
            </div>
          </div>

          {/* Info Principal */}
          <div className="flex justify-end mb-6">
            <p className="text-sm font-bold border border-black p-2 rounded inline-block uppercase bg-gray-50 print:bg-transparent">
              Fecha: {formatFecha(ppto.fecha)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 text-[11px]">
            <div className="border border-black p-4 bg-gray-50/50 print:bg-transparent">
              <h3 className="font-bold uppercase text-black border-b border-black pb-1 mb-2">Datos del Cliente</h3>
              <p className="mb-1"><span className="font-bold">Sr/es:</span> {ppto.cliente.empresa?.nombre || ppto.cliente.nombre}</p>
              {ppto.cliente.empresa?.cuit && <p className="mb-1"><span className="font-bold">CUIT:</span> {ppto.cliente.empresa.cuit}</p>}
              <p className="mb-1"><span className="font-bold">Domicilio:</span> {ppto.cliente.domicilio}</p>
              <p className="mb-1"><span className="font-bold">Teléfono:</span> {ppto.cliente.telefono}</p>
              <p className="mb-1"><span className="font-bold">Email:</span> {ppto.cliente.mail}</p>
            </div>
            <div className="border border-black p-4 bg-gray-50/50 print:bg-transparent">
              <h3 className="font-bold uppercase text-black border-b border-black pb-1 mb-2">Condiciones de Venta</h3>
              <p className="mb-1"><span className="font-bold">Forma de Pago:</span> {ppto.formaPago}</p>
              <p className="mb-1"><span className="font-bold">Moneda:</span> {ppto.moneda}</p>
              <p className="mb-1"><span className="font-bold">Validez de Oferta:</span> {ppto.validezDias} días</p>
              {equipoStr && (
                <div className="mt-3 pt-3 border-t border-black">
                  <p className="font-bold uppercase mb-1">Equipo Asociado (OT N° {ppto.orden.numero})</p>
                  <p className="uppercase">{equipoStr}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full text-left text-sm border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-100 font-bold uppercase text-xs border-b border-black">
                  <th className="p-3 border-r border-black w-16 text-center">Cant</th>
                  <th className="p-3 border-r border-black">Descripción</th>
                  <th className="p-3 border-r border-black w-32 text-right">Unitario</th>
                  <th className="p-3 w-32 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {ppto.items.map((item: any, idx: number) => (
                  <tr key={item.id} className={idx !== ppto.items.length - 1 ? "border-b border-gray-300" : ""}>
                    <td className="p-3 border-r border-black text-center font-bold">{item.cantidad}</td>
                    <td className="p-3 border-r border-black italic uppercase">{item.descripcion}</td>
                    <td className="p-3 border-r border-black text-right">${formatMoney(item.precio, 0)}</td>
                    <td className="p-3 text-right font-bold">${formatMoney(item.total, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end mt-6">
            <div className="w-72 border border-black bg-gray-50/50 print:bg-transparent">
              <div className="p-4 space-y-2">
                 {ppto.incluyeIva && (
                    <div className="flex justify-between items-center border-b border-black pb-2 mb-2">
                       <span className="text-[11px] font-bold uppercase text-black">Subtotal Neto:</span>
                       <span className="font-bold">${formatMoney(ppto.total / IVA_RATE, 0)}</span>
                    </div>
                 )}
                 <div className="flex justify-between items-center text-lg">
                    <span className="font-black uppercase">Total {ppto.incluyeIva ? "(IVA Inc.)" : ""}:</span>
                    <span className="font-black tracking-tight">${formatMoney(ppto.total, 0)}</span>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-[10px] leading-relaxed text-justify text-black italic px-2">
             <p className="font-bold uppercase not-italic text-black mb-1">Términos y condiciones:</p>
             <p>El presente presupuesto rige como una estimación de costos en base al diagnóstico efectuado. Si al desarmar o realizar las pruebas correspondientes se detectasen otros componentes averiados, el mismo quedará sujeto a revisión y re-cotización. {ppto.observaciones}</p>
          </div>
        </div>

        {/* Footer Firmas */}
        <div className="mt-16 pt-10 grid grid-cols-2 gap-20">
           <div className="text-center">
              <div className="border-t border-black pt-2 w-48 mx-auto">
                 <p className="font-bold text-[10px] uppercase">Autorizado por</p>
                 <p className="text-[10px] font-black uppercase text-black mt-1">Baugal SRL</p>
              </div>
           </div>
           <div className="text-center">
              <div className="border-t border-black pt-2 w-48 mx-auto">
                 <p className="font-bold text-[10px] uppercase">Conformidad del Cliente</p>
                 <p className="text-[10px] text-black uppercase mt-1">Firma y Aclaración</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
