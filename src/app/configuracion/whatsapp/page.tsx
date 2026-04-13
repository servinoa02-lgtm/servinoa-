import Link from "next/link";
import { ArrowLeft, MessageCircle, CheckCircle2, XCircle, Users, ExternalLink } from "lucide-react";

const EMPLEADOS = [
  { nombre: "Maximiliano Alarcon", telefono: "3875059482" },
  { nombre: "Mirko Aybar",         telefono: "3875840154" },
  { nombre: "Agostina Molina",     telefono: "3875941089" },
  { nombre: "Julio Bautista",      telefono: "3874569398" },
  { nombre: "Pablo Galloni",       telefono: "3874894011" },
  { nombre: "Nicolas Hissa",       telefono: "3876199932" },
];

export default function WhatsAppConfigPage() {
  const configurado =
    !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link
              href="/dashboard"
              className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all"
            >
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                Configuración
              </p>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">
                WhatsApp Notificaciones
              </h1>
            </div>
          </div>
          <div className="p-2 bg-green-50 rounded-xl border border-green-100 hidden sm:block">
            <MessageCircle size={24} className="text-green-600" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 w-full space-y-6">

        {/* Estado */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Estado</h2>

          {configurado ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-green-50 border-green-200">
              <CheckCircle2 size={18} className="text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-700">Activo</p>
                <p className="text-xs text-green-600">
                  Las notificaciones se envían automáticamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-50 border-red-200">
              <XCircle size={18} className="text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-700">No configurado</p>
                <p className="text-xs text-red-600">
                  Faltan las variables <code className="font-mono bg-red-100 px-1 rounded">WHATSAPP_TOKEN</code> y{" "}
                  <code className="font-mono bg-red-100 px-1 rounded">WHATSAPP_PHONE_ID</code> en Vercel.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pasos de configuración */}
        {!configurado && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
              Cómo activarlo (una sola vez)
            </h2>
            <ol className="space-y-4">
              {[
                {
                  paso: "1",
                  titulo: "Crear cuenta de desarrollador Meta",
                  desc: 'Entrá a developers.facebook.com con la cuenta de Facebook de la empresa y creá una app tipo "Business".',
                },
                {
                  paso: "2",
                  titulo: "Agregar WhatsApp a la app",
                  desc: 'Dentro de la app, buscá el producto "WhatsApp" y agregalo. Meta te da un número de prueba gratuito para empezar.',
                },
                {
                  paso: "3",
                  titulo: "Copiar el Token y el Phone ID",
                  desc: 'En WhatsApp → Primeros pasos, vas a ver el "Token de acceso temporal" y el "ID del número de teléfono". Copialos.',
                },
                {
                  paso: "4",
                  titulo: "Pegar en Vercel",
                  desc: "En tu proyecto Vercel → Settings → Environment Variables, agregá WHATSAPP_TOKEN y WHATSAPP_PHONE_ID. Redeploy y listo.",
                },
              ].map((item) => (
                <li key={item.paso} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                    {item.paso}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Empleados */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
              Empleados configurados
            </h2>
          </div>
          <p className="text-xs text-gray-400 font-medium -mt-2">
            Recibirán mensajes cuando se les asigne una tarea o se publique un aviso.
          </p>
          <div className="divide-y divide-gray-50">
            {EMPLEADOS.map((e) => (
              <div key={e.telefono} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">
                      {e.nombre.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{e.nombre}</span>
                </div>
                <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                  +54 9 {e.telefono.slice(0, 3)} {e.telefono.slice(3, 6)}-{e.telefono.slice(6)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">
            ¿Cuándo se mandan notificaciones?
          </h3>
          <ul className="space-y-1.5 text-xs text-blue-600 font-medium">
            <li>• Al crear una tarea → se notifica al empleado asignado</li>
            <li>• Al publicar un Aviso del Equipo → se notifica a todos</li>
          </ul>
        </div>

      </main>
    </div>
  );
}
