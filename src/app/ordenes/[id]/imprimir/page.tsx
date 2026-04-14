"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { formatFecha, formatFechaHora } from "@/lib/dateUtils";
import { ArrowLeft, Printer } from "lucide-react";

export default function OTImprimirPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tipo = searchParams.get("tipo") || "recepcion"; // 'recepcion' | 'retiro'

  const [orden, setOrden] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (id) {
      fetch(`/api/ordenes/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setOrden(data);
          setLoading(false);
          // Auto-lanzar visor de impresion despues de un margen
          setTimeout(() => {
            window.print();
          }, 800);
        })
        .catch(() => {
          setLoading(false);
        });
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

  if (!orden || orden.error) return <div className="p-20 text-center">Orden no encontrada</div>;

  const equipoStr = [orden.maquina?.nombre, orden.marca?.nombre, orden.modelo?.nombre].filter(Boolean).join(" - ");
  const ultimoRetiro = orden.retiros?.[0]; // Para constancia de retiro

  const renderRecepcion = () => (
    <div className="space-y-6 text-[11px] leading-relaxed text-black max-w-[210mm] mx-auto bg-white min-h-[297mm] flex flex-col p-8 print:p-0">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-red-600 pb-4 mb-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ServiNOA" className="h-10 object-contain mb-2" onError={(e) => e.currentTarget.style.display = 'none'} />
          <h1 className="text-2xl font-black uppercase tracking-widest leading-none mb-1 text-gray-900">OT #{orden.numero}</h1>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-red-600">Recepción de Equipo</h2>
        </div>
        <div className="text-right text-[10px] text-gray-700">
          <p className="font-black uppercase text-xl mb-1 text-black">Baugal SRL</p>
          <p>CUIT: 30-71885628-7 - Resp. Inscripto</p>
          <p>Buenos Aires 1287 - Salta</p>
          <p>Tel: +54 9 387-2239277</p>
        </div>
      </div>

      <div className="flex justify-end">
        <p className="text-sm font-bold bg-gray-100 px-4 py-1 rounded inline-block">Fecha de Recepción: {formatFecha(orden.fechaRecepcion)}</p>
      </div>

      {/* Datos Cliente */}
      <div className="border border-black p-4 rounded-lg bg-gray-50/50 print:bg-transparent">
        <h3 className="font-bold uppercase mb-2 border-b border-gray-300 pb-1">Datos del Cliente</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {orden.cliente.empresa && <p><span className="font-bold">Sres (Empresa):</span> {orden.cliente.empresa.nombre}</p>}
          <p><span className="font-bold">Cliente:</span> {orden.cliente.nombre}</p>
          {orden.cliente.empresa?.cuit && <p><span className="font-bold">Cuit:</span> {orden.cliente.empresa.cuit}</p>}
          <p><span className="font-bold">Mail:</span> {orden.cliente.mail}</p>
          <p><span className="font-bold">Domicilio:</span> {orden.cliente.domicilio}</p>
          <p><span className="font-bold">Teléfono:</span> {orden.cliente.telefono}</p>
        </div>
      </div>

      {/* Datos Equipo */}
      <div className="border border-black p-4 text-[12px] rounded-lg">
        <h3 className="font-bold uppercase mb-2 border-b border-gray-300 pb-1">Datos del Equipo</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          <p><span className="font-bold">Máquina:</span> {orden.maquina?.nombre || '-'}</p>
          <p><span className="font-bold">Marca:</span> {orden.marca?.nombre || '-'}</p>
          <p><span className="font-bold">Modelo:</span> {orden.modelo?.nombre || '-'}</p>
          <p><span className="font-bold">N° de serie:</span> {orden.nroSerie || '-'}</p>
        </div>
        <p className="mb-2"><span className="font-bold">Accesorios:</span> {orden.accesorios || 'Ninguno'}</p>
        <div className="bg-gray-100 p-3 rounded border border-gray-300 print:bg-transparent">
          <p className="font-bold mb-1">Falla Declarada:</p>
          <p className="italic">{orden.falla || 'No especificada.'}</p>
        </div>
      </div>

      {/* Nota Legal */}
      <div className="text-[9px] text-justify space-y-2 mt-6">
        <p><span className="font-bold">NOTA:</span> En caso de no ser retirado el equipo, pasados los 30 días y hasta los 90 días se cobrará en concepto de cargo por depósito un alquiler diario equivalente a u$s 1,00 + IVA.- Autorizan a ServiNoa, a partir de los 90 días de la fecha de recepción a disponer libremente del equipo, sin derecho a reclamo alguno.</p>
        <p>El Equipo se recibe con los accesorios mencionados precedentemente y se podrá retirar única y exclusivamente en Buenos Aires 1287 por cuestiones de prueba del equipo al momento de la entrega.</p>
        <p className="font-bold mt-2">Habiendo leído la NOTA, firmo en conformidad.</p>
      </div>

      {/* Firmas */}
      <div className="mt-14 pt-6 grid grid-cols-2 gap-20 items-end">
        <div className="text-center">
          <div className="mb-3 uppercase font-bold text-xs text-red-600 bg-red-50 p-2 border border-red-200 rounded">
            CARGO POR REVISIÓN: <br/>$ 65.000,00 + IVA
          </div>
          <div className="border-t border-black pt-2">
            <span className="font-bold uppercase text-[10px]">Firma Autorizada ServiNoa</span>
          </div>
        </div>
        <div className="text-center flex flex-col items-center">
          {orden.firmaCliente ? (
            <div className="flex flex-col items-center mb-1">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={orden.firmaCliente} alt="Firma Cliente" className="h-20 w-auto object-contain border-b border-black mb-1" />
               <span className="font-bold uppercase text-[10px]">Firma del Cliente Digital</span>
            </div>
          ) : (
            <div className="border-t border-black pt-2 w-full mt-16 mb-1">
              <span className="font-bold uppercase text-[10px]">Firma del Cliente</span>
            </div>
          )}
          <p className="font-bold uppercase mt-1">{orden.cliente.nombre}</p>
          {!orden.firmaCliente && <p className="text-[10px] text-gray-500">Aclaración y DNI</p>}
        </div>
      </div>

      <div className="text-center mt-6 p-3 bg-gray-100 border border-gray-300 rounded text-[10px] font-bold">
        <p className="text-red-600">IMPORTANTE: En todos los casos para retirar el equipo, debe presentar este original o documento identificatorio.</p>
        <p>Horario de atención: Lunes a Viernes de 09:00 a 17:00 | Tel: 387 4569 398 - 387 4894 011</p>
      </div>

      {/* Linea de corte */}
      <div className="border-t-2 border-dashed border-gray-400 my-8 flex items-center justify-center">
        <span className="bg-white px-2 text-gray-400 text-xs italic">Cortar aquí</span>
      </div>

      {/* MITAD INFERIOR (Duplicado Breve) */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-black uppercase tracking-widest leading-none">OT #{orden.numero}</h1>
        <p className="text-sm font-bold bg-gray-100 px-3 py-1 rounded inline-block">Fecha: {formatFecha(orden.fechaRecepcion)}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
         <div className="border border-black p-3 rounded-lg print:bg-transparent">
          <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-1">Cliente</h3>
          <p>{orden.cliente.empresa?.nombre || orden.cliente.nombre}</p>
          <p>Tel: {orden.cliente.telefono}</p>
         </div>
         <div className="border border-black p-3 rounded-lg print:bg-transparent">
          <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-1">Equipo</h3>
          <p>{equipoStr}</p>
          <p className="italic truncate">Falla: {orden.falla}</p>
         </div>
      </div>
    </div>
  );

  const renderRetiro = () => (
    <div className="space-y-8 text-[12px] leading-relaxed text-black max-w-[210mm] mx-auto min-h-[297mm] flex flex-col pt-10 p-8 print:p-0">
      <div className="flex justify-between items-start border-b-4 border-red-600 pb-6 mb-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ServiNOA" className="h-12 object-contain mb-3" onError={(e) => e.currentTarget.style.display = 'none'} />
          <h1 className="text-3xl font-black uppercase tracking-widest leading-none mb-2 text-gray-900">CONSTANCIA DE RETIRO</h1>
          <h2 className="text-xl font-bold uppercase tracking-widest text-red-600">Orden de Trabajo #{orden.numero}</h2>
        </div>
        <div className="text-right text-[11px] text-gray-700">
          <p className="font-black uppercase text-2xl mb-1 text-black">Baugal SRL</p>
          <p>Buenos Aires 1287 - Salta</p>
          <p>Tel: +54 9 387-2239277</p>
        </div>
      </div>

      <div className="py-6 space-y-4 text-sm print:break-inside-avoid">
        <p className="text-justify leading-loose">
          En la ciudad de Salta, a los <strong>{ultimoRetiro ? formatFecha(ultimoRetiro.fecha) : formatFechaHora(new Date().toISOString())}</strong>, 
          hago constar que recibo de conformidad el equipo detallado a continuación, correspondiente a la Orden de Trabajo N° <strong>{orden.numero}</strong>.
        </p>

        <div className="border border-black p-6 rounded-lg bg-gray-50/30 print:bg-transparent">
          <h3 className="font-bold uppercase text-sm mb-4 border-b border-gray-300 pb-2">Detalle del Equipo Entregado</h3>
          <div className="grid grid-cols-2 gap-y-4">
            <p><span className="font-bold text-gray-600">Cliente / Empresa:</span> {orden.cliente.empresa?.nombre || orden.cliente.nombre}</p>
            <p><span className="font-bold text-gray-600">Equipo:</span> {equipoStr}</p>
            <p><span className="font-bold text-gray-600">Número de Serie:</span> {orden.nroSerie || 'N/A'}</p>
            <p><span className="font-bold text-gray-600">Estado de Entrega:</span> {orden.estado === "ENTREGADO_REALIZADO" ? "REPARADO / REALIZADO" : (orden.estado === "ENTREGADO_SIN_REALIZAR" ? "SIN REPARAR" : "OTRO")}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
             <p><span className="font-bold text-gray-600">Diagnóstico / Revisión:</span></p>
             <p className="italic mt-1 text-gray-800">{orden.revisionTecnica || 'Ninguno registrado.'}</p>
          </div>
        </div>

        <p className="text-justify pt-4 leading-loose">
          Manifiesto que el equipo fue probado y revisado en las instalaciones de ServiNoa, verificando su funcionamiento (en caso de aplicar) 
          y asumiendo que los accesorios entregados corresponden a los declarados en el ingreso.
        </p>
      </div>

      {ultimoRetiro && (
        <div className="mt-16 pt-8 border-t border-dashed border-gray-300 print:break-inside-avoid">
          <h3 className="font-bold uppercase mb-6">Datos de quien retira</h3>
          <div className="grid grid-cols-2 gap-8 items-end">
            <div className="space-y-4">
              <p><span className="font-bold">Nombre Completo:</span> {ultimoRetiro.nombre}</p>
              <p><span className="font-bold">DNI:</span> {ultimoRetiro.dni}</p>
              <p><span className="font-bold">Fecha Efectiva:</span> {formatFechaHora(ultimoRetiro.fecha)}</p>
            </div>
            {ultimoRetiro.firma ? (
              <div className="text-center flex flex-col items-center">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={ultimoRetiro.firma} alt="Firma" className="h-24 w-auto border-b border-black object-contain mb-2" />
                 <span className="font-bold text-xs uppercase">Firma Digital Registrada</span>
              </div>
            ) : (
              <div className="text-center pt-16">
                 <div className="border-t border-black mb-2 px-10 inline-block"></div>
                 <p className="font-bold uppercase text-xs">Firma en conformidad</p>
              </div>
            )}
          </div>
        </div>
      )}
      {!ultimoRetiro && (
        <div className="mt-20 pt-10 grid grid-cols-2 gap-10">
           <div className="text-center">
              <div className="border-t border-black pt-2">
                 <p className="font-bold uppercase text-xs">Aclaración y DNI</p>
              </div>
           </div>
           <div className="text-center">
              <div className="border-t border-black pt-2">
                 <p className="font-bold uppercase text-xs">Firma en conformidad</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-200 py-10 print:bg-white print:py-0 font-sans">
      <div className="max-w-4xl mx-auto px-4 print:px-0 flex justify-between items-center mb-6 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm font-bold">
          <ArrowLeft size={16} /> Volver
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 px-6 py-2.5 rounded-xl shadow-md font-bold uppercase tracking-widest transition-all">
          <Printer size={18} /> Imprimir Archivo
        </button>
      </div>
      
      <div className="max-w-4xl mx-auto bg-white shadow-xl shadow-black/5 print:shadow-none p-12 print:p-0">
         {tipo === "recepcion" && renderRecepcion()}
         {tipo === "retiro" && renderRetiro()}
      </div>
    </div>
  );
}
