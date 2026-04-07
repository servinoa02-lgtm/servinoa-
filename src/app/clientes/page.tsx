"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search, Building2, User, Phone, Mail, FileText, ArrowLeft, Trash2 } from "lucide-react";
import { Table } from "@/components/ui/Table";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";

interface Cliente {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  dni?: string | null;
  domicilio?: string | null;
  iva: string;
  empresa?: { nombre: string } | null;
  saldo?: number;
  _count?: { ordenes: number; presupuestos: number };
}

export default function ClientesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorDelete, setErrorDelete] = useState<string | null>(null);

  // Formulario nuevo cliente
  const [fNombre, setFNombre] = useState("");
  const [fEmpresa, setFEmpresa] = useState("");
  const [fTelefono, setFTelefono] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fDni, setFDni] = useState("");
  const [fDomicilio, setFDomicilio] = useState("");
  const [fIva, setFIva] = useState("NO incluyen IVA");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const cargar = () => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) => { setClientes(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = clientes.filter((c) => {
    const texto = busqueda.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(texto) ||
      (c.empresa?.nombre || "").toLowerCase().includes(texto) ||
      (c.telefono || "").includes(texto) ||
      (c.email || "").toLowerCase().includes(texto)
    );
  });

  const eliminarCliente = async (id: string) => {
    setEliminando(true);
    setErrorDelete(null);
    const res = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    const data = await res.json();
    setEliminando(false);
    if (!res.ok) {
      setErrorDelete(data.error || "Error al eliminar");
      return;
    }
    setConfirmDelete(null);
    cargar();
  };

  const guardarCliente = async () => {
    if (!fNombre.trim()) return;
    setGuardando(true);
    await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: fNombre,
        empresaNombre: fEmpresa || null,
        telefono: fTelefono || null,
        email: fEmail || null,
        dni: fDni || null,
        domicilio: fDomicilio || null,
        iva: fIva,
      }),
    });
    setMostrarForm(false);
    setFNombre(""); setFEmpresa(""); setFTelefono(""); setFEmail(""); setFDni(""); setFDomicilio("");
    setGuardando(false);
    cargar();
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500 animate-pulse">Cargando datos...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 p-1.5 rounded-md">
                <User className="text-purple-600 w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Directorio de Clientes</h1>
            </div>
          </div>
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo Cliente</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Barra de Filtros */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, empresa, teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl mb-0 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-shadow"
            />
          </div>
          <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            {filtrados.length} cliente{filtrados.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Tabla de Resultados */}
        <Table
          data={filtrados}
          onRowClick={(c) => router.push(`/clientes/${c.id}`)}
          emptyMessage="No se encontraron clientes con esos parámetros."
          columns={[
            {
              header: "Empresa",
              cell: (c) => (
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" />
                  <span className="font-medium text-slate-700">{c.empresa?.nombre || "-"}</span>
                </div>
              )
            },
            {
              header: "Contacto Principal",
              cell: (c) => (
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">{c.nombre}</span>
                </div>
              )
            },
            {
              header: "Contacto",
              cell: (c) => (
                <div className="flex flex-col gap-1 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5"><Phone size={14}/> {c.telefono || "-"}</div>
                  <div className="flex items-center gap-1.5"><Mail size={14}/> {c.email || "-"}</div>
                </div>
              )
            },
            {
              header: "Saldo Pendiente",
              cell: (c) => (
                <div className="font-semibold">
                  <span className={c.saldo && c.saldo > 0 ? "text-red-500" : "text-green-600"}>
                    ${(c.saldo || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )
            },
            {
              header: "Condición Fiscal",
              cell: (c) => (
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  <span>{c.iva.includes("NO") ? "Consumidor Final" : c.iva}</span>
                </div>
              )
            },
            {
              header: "",
              cell: (c) => (
                <button
                  onClick={(e) => { e.stopPropagation(); setErrorDelete(null); setConfirmDelete({ id: c.id, nombre: c.nombre }); }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar cliente"
                >
                  <Trash2 size={15} />
                </button>
              )
            }
          ]}
        />
      </main>

      {/* Drawer: Nuevo Cliente */}
      <Drawer
        isOpen={mostrarForm}
        onClose={() => setMostrarForm(false)}
        title="Alta de Nuevo Cliente"
      >
        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Empresa / Institución (Opcional)</label>
            <input type="text" value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)}
              placeholder="Ej. Acme Corp..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white shadow-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Nombre del cliente *</label>
            <input type="text" value={fNombre} onChange={(e) => setFNombre(e.target.value)}
              placeholder="Juan Pérez..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white shadow-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">DNI / CUIT</label>
              <input type="text" value={fDni} onChange={(e) => setFDni(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Teléfono</label>
              <input type="tel" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email</label>
            <input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Domicilio / Dirección</label>
            <input type="text" value={fDomicilio} onChange={(e) => setFDomicilio(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Condición frente al IVA</label>
            <select value={fIva} onChange={(e) => setFIva(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm">
              <option value="NO incluyen IVA">Consumidor Final (No Incluye IVA)</option>
              <option value="Incluyen IVA">Responsable Inscripto (Incluye IVA)</option>
            </select>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-200">
            <button
              onClick={guardarCliente}
              disabled={guardando || !fNombre.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md"
            >
              {guardando ? (
                <span className="animate-pulse">Guardando temporalmente...</span>
              ) : (
                <>
                  <Plus size={18} />
                  Guardar Cliente Nuevo
                </>
              )}
            </button>
          </div>
        </div>
      </Drawer>

      {/* ConfirmDialog: Eliminar Cliente */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar cliente"
        message={`¿Estás seguro de que querés eliminar a "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel={eliminando ? "Eliminando..." : "Sí, eliminar"}
        onCancel={() => { setConfirmDelete(null); setErrorDelete(null); }}
        onConfirm={() => confirmDelete && eliminarCliente(confirmDelete.id)}
      />

      {/* Error al eliminar */}
      {errorDelete && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
          {errorDelete}
          <button onClick={() => setErrorDelete(null)} className="ml-3 underline">Cerrar</button>
        </div>
      )}
    </div>
  );
}

