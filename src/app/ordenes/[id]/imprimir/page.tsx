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
    <div className="text-[11px] text-black w-[210mm] min-h-[297mm] mx-auto bg-white p-10 print:p-0 tracking-normal" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ServiNOA" className="h-24 w-auto object-contain origin-top-left" onError={(e) => e.currentTarget.style.display = 'none'} />
        
        <div className="text-right text-[10px] leading-tight">
          <p className="font-black text-lg mb-1">BAUGAL SRL</p>
          <p>CUIT: 30-71885628-7</p>
          <p>Responsable Inscripto</p>
          <p>Act. Económicas: 30-71885628-7</p>
          <p>Domicilio: Buenos Aires 1287 - Salta</p>
          <p>Cel: 387-2239277</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col justify-between items-start">
        <h1 className="text-2xl font-black uppercase tracking-widest text-black">Constancia de Recepción</h1>
        <h2 className="text-xl font-bold mt-1 text-gray-800">OT N° {orden.numero}</h2>
      </div>

      <div className="flex justify-end mb-4">
        <p className="text-[11px] font-bold border border-black px-3 py-1">Fecha de Recepción: {formatFecha(orden.fechaRecepcion)}</p>
      </div>

      {/* DATOS DEL CLIENTE */}
      <div className="mb-4">
        <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-[12px] bg-gray-100 px-2 print:bg-transparent print:border-t">Datos del Cliente</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 px-2">
          {orden.cliente.empresa && <p><span className="font-bold">Sres:</span> {orden.cliente.empresa.nombre}</p>}
          <p><span className="font-bold">Cliente:</span> {orden.cliente.nombre}</p>
          {orden.cliente.empresa?.cuit && <p><span className="font-bold">CUIT:</span> {orden.cliente.empresa.cuit}</p>}
          <p><span className="font-bold">Mail:</span> {orden.cliente.mail}</p>
          <p><span className="font-bold">Domicilio:</span> {orden.cliente.domicilio}</p>
          <p><span className="font-bold">Teléfono:</span> {orden.cliente.telefono}</p>
        </div>
      </div>

      {/* DATOS DEL EQUIPO */}
      <div className="mb-4">
        <h3 className="font-bold border-b border-black pb-1 mb-2 uppercase text-[12px] bg-gray-100 px-2 print:bg-transparent print:border-t">Datos del Equipo</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-3 px-2">
          <p><span className="font-bold">Máquina:</span> {orden.maquina?.nombre || '-'}</p>
          <p><span className="font-bold">Marca:</span> {orden.marca?.nombre || '-'}</p>
          <p><span className="font-bold">Modelo:</span> {orden.modelo?.nombre || '-'}</p>
          <p><span className="font-bold">Nº de serie:</span> {orden.nroSerie || '-'}</p>
        </div>
        <div className="px-2">
           <p className="mb-2"><span className="font-bold">Accesorios:</span> {orden.accesorios || 'Ninguno'}</p>
           <p className="mb-1"><span className="font-bold">Falla:</span> {orden.falla || 'No especificada.'}</p>
        </div>
      </div>

      {/* NOTA LEGAL */}
      <div className="text-justify text-[9px] mb-8 mt-4 leading-relaxed px-2">
        <p className="mb-2"><span className="font-bold">NOTA:</span> En caso de no ser retirado el equipo, pasados los 30 días y hasta los 90 días se cobrará en concepto de cargo por depósito un alquiler diario equivalente a u$s 1,00 + IVA.- Autorizan a ServiNoa, a partir de los 90 días de la fecha de recepción a disponer libremente del equipo, sin derecho a reclamo alguno.</p>
        <p className="mb-2">El Equipo se recibe con los accesorios mencionados precedentemente y se podrá retirar única y exclusivamente en Buenos Aires 1287 por cuestiones de prueba del equipo al momento de la entrega.</p>
        <p className="font-bold">Habiendo leído la NOTA, firmo en conformidad.</p>
      </div>

      {/* FIRMAS */}
      <div className="grid grid-cols-2 gap-10 mt-10 mb-6 px-10">
        <div className="text-center">
          <div className="mb-4 text-[10px] font-bold border border-black inline-block px-3 py-1 bg-gray-50 print:bg-transparent">
            CARGO POR PRESUPUESTAR:<br/>$ 65.000,00 + IVA
          </div>
          <div className="border-t border-black pt-1 w-48 mx-auto">
            <span className="font-bold">Firma Autorizada ServiNoa</span>
          </div>
        </div>
        
        <div className="text-center flex flex-col justify-end items-center">
          {orden.firmaCliente ? (
            <div className="flex flex-col items-center">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={orden.firmaCliente} alt="Firma Cliente" className="h-16 w-auto object-contain border-b border-black mb-1" />
            </div>
          ) : (
            <div className="border-t border-black pt-1 w-48 mx-auto mt-12 mb-1"></div>
          )}
          <span className="font-bold">Firma del Cliente</span>
          <p className="uppercase text-[10px]">{orden.cliente.nombre}</p>
          {!orden.firmaCliente && <p className="text-[10px]">Aclaración y DNI</p>}
        </div>
      </div>

      <div className="text-center mb-8 border-t border-b border-black py-2 font-bold text-[9px] bg-gray-50 print:bg-transparent">
        <p>IMPORTANTE!!! En todos los casos para retirar el equipo, debe presentar este original.</p>
        <p>Horario de atención: Lunes a Viernes de 09:00 a 17:00 | Tel: 387 4569 398 - 387 4894 011</p>
      </div>

      {/* CORTE */}
      <div className="border-t border-dashed border-black relative my-10">
          <span className="absolute -top-3 left-[48%] bg-white px-2 text-[10px] italic">Cortar aquí</span>
      </div>

      {/* MITAD INFERIOR (Duplicado) */}
      <div className="text-[11px]">
        <div className="flex justify-between items-center border-b border-black pb-2 mb-2">
          <h2 className="text-lg font-black uppercase">OT N° {orden.numero}</h2>
          <p className="text-[10px] font-bold">Recepción: {formatFecha(orden.fechaRecepcion)}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-1 border-b border-gray-300">Cliente</h3>
            <p>Sres: {orden.cliente.empresa?.nombre || orden.cliente.nombre}</p>
            <p>CUIT: {orden.cliente.empresa?.cuit || '-'}</p>
            <p>Mail: {orden.cliente.mail}</p>
            <p>Tel: {orden.cliente.telefono}</p>
          </div>
          <div>
            <h3 className="font-bold mb-1 border-b border-gray-300">Equipo</h3>
            <p>{equipoStr}</p>
            <p>Serie: {orden.nroSerie || '-'}</p>
            <p>Accesorios: {orden.accesorios || 'Ninguno'}</p>
            <p className="italic">Falla: {orden.falla}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRetiro = () => (
    <div className="text-[12px] text-black w-[210mm] min-h-[297mm] mx-auto bg-white p-10 print:p-0 tracking-normal" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ServiNOA" className="h-24 w-auto object-contain origin-top-left" onError={(e) => e.currentTarget.style.display = 'none'} />
        
        <div className="text-right text-[11px] leading-tight">
          <p className="font-black text-xl mb-1">BAUGAL SRL</p>
          <p>Buenos Aires 1287 - Salta</p>
          <p>Cel: 387-2239277</p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-widest text-black mb-1">Constancia de Retiro</h1>
        <h2 className="text-xl font-bold text-gray-800">OT N° {orden.numero}</h2>
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
    <div className="min-h-screen bg-gray-200 py-10 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto px-4 print:px-0 flex justify-between items-center mb-6 print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm font-bold">
          <ArrowLeft size={16} /> Volver
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 px-6 py-2.5 rounded-xl shadow-md font-bold uppercase tracking-widest transition-all">
          <Printer size={18} /> Imprimir Archivo
        </button>
      </div>
      
      <div className="w-[210mm] mx-auto shadow-xl shadow-black/5 print:shadow-none print:p-0">
         {tipo === "recepcion" && renderRecepcion()}
         {tipo === "retiro" && renderRetiro()}
      </div>
    </div>
  );
}
