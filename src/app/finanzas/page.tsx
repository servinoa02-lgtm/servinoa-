"use client";

import { obtenerSaldosCajas } from "@/lib/financeUtils";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, Wallet,
  ArrowUpRight, ArrowDownRight, Plus, Clock, ChevronRight,
  Receipt, CheckCircle2, Save, AlertTriangle,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Drawer } from "@/components/ui/Drawer";
import { ProveedorQuickAdd } from "@/components/ui/ProveedorQuickAdd";
import { formatFecha, hoyISO } from "@/lib/dateUtils";
import { FORMAS_PAGO } from "@/lib/constants";
import { formatoService } from "@/services/formatoService";


function campo(label: string, children: React.ReactNode) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-red-600 focus:bg-white transition-all";
const selectCls = inputCls + " appearance-none cursor-pointer";

interface Caja { id: string; nombre: string; saldo: number; }
interface Cliente { id: string; nombre: string; empresa?: { nombre: string } | null; }
interface Presupuesto {
  id: string; numero: number; total: number; cobrado: number; saldo: number;
  fecha: string; estado?: string; clienteId?: string;
  cliente?: { nombre: string; empresa?: { nombre: string } | null };
}
interface Cheque {
  id: string; importe: number; librador?: string | null; banco?: string | null;
  fechaCobro?: string | null; diasVencimiento?: number | null; vencimientoTexto?: string;
  estado: string; cliente?: { nombre: string; empresa?: { nombre: string } | null } | null;
}
interface Movimiento {
  id: string; origen: "INGRESO" | "EGRESO"; fecha: string;
  descripcion: string; importe: number; formaPago: string;
  cliente?: string; caja?: string;
}
interface Proveedor { id: string; nombre: string; empresa?: string | null; domicilio?: string | null; telefono?: string | null; rubro?: string | null; }

export default function FinanzasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Datos principales ──────────────────────────────────────────────────────
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cobrosP, setCobrosP] = useState<Presupuesto[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [totalCajas, setTotalCajas] = useState(0);
  const [totalCobrosMes, setTotalCobrosMes] = useState(0);
  const [totalGastosMes, setTotalGastosMes] = useState(0);
  const [totalDeudaClientes, setTotalDeudaClientes] = useState(0);
  const [cutoffMode, setCutoffMode] = useState(false); // Nuevo: Modo corte 10/04
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  const TIPOS_GASTO = [
    { value: "GASTO_VARIOS", label: "Gastos a clasificar / Varios" },
    { value: "SUELDO", label: "Sueldo / Personal" },
    { value: "INSUMOS", label: "Insumos y Repuestos" },
    { value: "MANTENIMIENTO", label: "Mantenimiento Local" },
    { value: "IMPUESTOS", label: "Impuestos y Servicios" },
    { value: "LOGISTICA", label: "Logística y Envíos" },
    { value: "EQUIPAMIENTO", label: "Equipamiento Taller" }
  ];

  // ── Form Cobro ─────────────────────────────────────────────────────────────
  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [cobroTipo, setCobroTipo] = useState<"PRESUPUESTO" | "COBRANZA_VARIA">("PRESUPUESTO");
  const [cobroClienteId, setCobroClienteId] = useState("");
  const [pptosDeCiente, setPptosDeCiente] = useState<Presupuesto[]>([]);
  const [cobroPptoId, setCobroPptoId] = useState("");
  const [cobroPptoInfo, setCobroPptoInfo] = useState<Presupuesto | null>(null);
  const [cobroImporte, setCobroImporte] = useState("");
  const [cobroFormaPago, setCobroFormaPago] = useState("Efectivo");
  const [cobroCajaId, setCobroCajaId] = useState("");
  const [cobroFecha, setCobroFecha] = useState(hoyISO());
  const [cobroDescripcion, setCobroDescripcion] = useState("");
  const [chqNumero, setChqNumero] = useState("");
  const [chqBanco, setChqBanco] = useState("");
  const [chqEmision, setChqEmision] = useState("");
  const [chqCobro, setChqCobro] = useState("");
  const [guardandoCobro, setGuardandoCobro] = useState(false);
  const [errCobro, setErrCobro] = useState("");

  // ── Form Gasto ─────────────────────────────────────────────────────────────
  const [mostrarGasto, setMostrarGasto] = useState(false);
  const [gastoTipo, setGastoTipo] = useState<"GASTO_VARIOS" | "SUELDO">("GASTO_VARIOS");
  const [gastoDescripcion, setGastoDescripcion] = useState("");
  const [gastoImporte, setGastoImporte] = useState("");
  const [gastoFormaPago, setGastoFormaPago] = useState("Efectivo");
  const [gastoCajaId, setGastoCajaId] = useState("");
  const [gastoProveedorId, setGastoProveedorId] = useState("");
  const [gastoComprobante, setGastoComprobante] = useState("");
  const [gastoEmpleado, setGastoEmpleado] = useState("");
  const [gastoDesde, setGastoDesde] = useState("");
  const [gastoHasta, setGastoHasta] = useState("");
  const [gastoFecha, setGastoFecha] = useState(hoyISO());
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [errGasto, setErrGasto] = useState("");

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const cargar = useCallback(async (silent = false) => {
    if (status !== "authenticated") return;
    if (!silent) setLoading(true);
    setErrorCarga("");
    try {
      const responses = await Promise.all([
        fetch("/api/cajas"),
        fetch("/api/cobranzas"),
        fetch("/api/gastos"),
        fetch("/api/cheques"),
        fetch("/api/presupuestos"),
        fetch("/api/clientes"),
        fetch("/api/proveedores"),
        fetch("/api/usuarios"),
      ]);

      // Verificar que todas las respuestas sean ok
      for (const r of responses) {
        if (!r.ok) throw new Error(`Error al cargar datos (${r.status})`);
      }

      const [rCajas, rCobros, rGastos, rCheques, rPptos, rClientes, rProveedores, rUsuarios] = await Promise.all(
        responses.map(r => r.json())
      );

      // Si estamos en modo corte, recalculamos los saldos de las cajas
      let finalCajas = rCajas;
      if (cutoffMode) {
        // En un escenario real, llamaríamos a la API con parámetro o filtraríamos localmente
        const resCorte = await fetch("/api/cajas?date=2026-04-11T00:00:00Z").then(r => r.json());
        finalCajas = resCorte;
      }

      setCajas(finalCajas);
      setClientes(rClientes.data);
      setProveedores(rProveedores.data || rProveedores);
      setUsuarios(rUsuarios.data || rUsuarios);

      // Totales globales para KPIs (Asegurar que sean números para evitar React #300)
      setTotalCajas(Number(finalCajas.reduce((s: any, c: any) => s + (c.saldo || 0), 0)));
      setTotalCobrosMes(Number(rCobros.totalMonth || 0));
      setTotalGastosMes(Number(rGastos.totalMonth || 0));
      setTotalDeudaClientes(Number(rClientes.globalSaldo || 0));

      if (rCajas.length > 0) {
        setCobroCajaId(prev => prev || rCajas[0].id);
        setGastoCajaId(prev => prev || rCajas[0].id);
      }

      const pptoList = rPptos.data || rPptos;
      setCobrosP(pptoList.filter((p: any) => p.estado === "APROBADO" && p.saldo > 0));

      const hoy = new Date();
      const en30 = new Date(hoy); en30.setDate(hoy.getDate() + 30);
      setCheques((rCheques as Cheque[]).filter((c: any) => {
        if (c.estado !== "EN_CARTERA" || !c.fechaCobro) return false;
        return new Date(c.fechaCobro) <= en30;
      }));

      const cobrosData = rCobros.data || rCobros;
      const gastosData = rGastos.data || rGastos;

      const ingresos: Movimiento[] = (cobrosData as any[]).map(c => ({
        id: c.id, origen: "INGRESO" as const, fecha: c.fecha,
        descripcion: c.presupuesto ? `Cobro Ppto #${c.presupuesto.numero}` : c.descripcion || "Cobro varios",
        importe: c.importe, formaPago: c.formaPago,
        cliente: c.cliente?.empresa?.nombre ?? c.cliente?.nombre,
        caja: c.caja?.nombre,
      }));
      const egresos: Movimiento[] = (gastosData as any[]).map(g => ({
        id: g.id, origen: "EGRESO" as const, fecha: g.fecha,
        descripcion: g.descripcion, importe: g.importe, formaPago: g.formaPago,
        caja: g.caja?.nombre,
      }));

      const todos = [...ingresos, ...egresos]
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      setMovimientos(todos);
    } catch (e: any) {
      console.error(e);
      setErrorCarga(e.message || "Error al cargar datos financieros");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { cargar(); }, [cargar]);
  useAutoRefresh(() => cargar(true));

  // Presupuestos del cliente seleccionado
  useEffect(() => {
    if (cobroClienteId && cobroTipo === "PRESUPUESTO") {
      fetch("/api/presupuestos")
        .then(r => r.json())
        .then((res: any) => {
          const d = res.data || res;
          setPptosDeCiente(d.filter((p: any) => p.clienteId === cobroClienteId && p.estado === "APROBADO" && p.saldo > 0));
        });
    } else {
      setPptosDeCiente([]);
    }
  }, [cobroClienteId, cobroTipo]);

  const resultadoMes = totalCobrosMes - totalGastosMes;

  // ── Helpers form ───────────────────────────────────────────────────────────
  const abrirFormCobro = (ppto?: Presupuesto) => {
    resetCobro();
    if (ppto) {
      setCobroTipo("PRESUPUESTO");
      setCobroClienteId(ppto.clienteId || "");
      setCobroPptoId(ppto.id);
      setCobroPptoInfo(ppto);
      setCobroImporte(ppto.saldo.toString());
    }
    setMostrarCobro(true);
  };

  const resetCobro = () => {
    setCobroTipo("PRESUPUESTO"); setCobroClienteId(""); setCobroPptoId(""); setCobroPptoInfo(null);
    setCobroImporte(""); setCobroDescripcion(""); setCobroFormaPago("Efectivo");
    setCobroFecha(hoyISO());
    setChqNumero(""); setChqBanco(""); setChqEmision(""); setChqCobro(""); setErrCobro("");
  };

  const resetGasto = () => {
    setGastoTipo("GASTO_VARIOS"); setGastoDescripcion(""); setGastoImporte("");
    setGastoFormaPago("Efectivo"); setGastoProveedorId(""); setGastoComprobante("");
    setGastoEmpleado(""); setGastoDesde(""); setGastoHasta("");
    setGastoFecha(hoyISO()); setErrGasto("");
  };

  const guardarCobro = async () => {
    if (!cobroCajaId || !cobroImporte) { setErrCobro("Importe y caja son obligatorios"); return; }
    if (cobroTipo === "PRESUPUESTO" && !cobroPptoId) { setErrCobro("Seleccioná un presupuesto"); return; }
    if (cobroTipo === "COBRANZA_VARIA" && !cobroDescripcion) { setErrCobro("Ingresá una descripción"); return; }
    setGuardandoCobro(true); setErrCobro("");
    const res = await fetch("/api/cobranzas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: cobroTipo,
        clienteId: cobroClienteId || null,
        presupuestoId: cobroTipo === "PRESUPUESTO" ? cobroPptoId : null,
        descripcion: formatoService.capitalizarPrimeraLetra(cobroDescripcion || "Cobro varios"),
        importe: parseFloat(cobroImporte),
        formaPago: cobroFormaPago,
        cajaId: cobroCajaId,
        usuarioId: (session?.user as any)?.id,
        fecha: cobroFecha,
        ...(cobroFormaPago === "Cheque" && {
          chequeNumero: formatoService.capitalizarPalabras(chqNumero), chequeBanco: formatoService.capitalizarPalabras(chqBanco),
          chequeFechaEmision: chqEmision, chequeFechaCobro: chqCobro,
        }),
      }),
    });
    if (res.ok) {
      setMostrarCobro(false); resetCobro(); await cargar();
    } else {
      setErrCobro("Error al registrar el cobro");
    }
    setGuardandoCobro(false);
  };

  const guardarGasto = async () => {
    if (!gastoImporte || !gastoCajaId) { setErrGasto("Importe y caja son obligatorios"); return; }
    if (gastoTipo !== "SUELDO" && !gastoDescripcion) { setErrGasto("Ingresá una descripción"); return; }
    if (gastoTipo === "SUELDO" && !gastoEmpleado) { setErrGasto("Ingresá el nombre del empleado"); return; }
    setGuardandoGasto(true); setErrGasto("");
    const res = await fetch("/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: gastoTipo,
        descripcion: gastoTipo === "SUELDO" ? `SUELDO ${gastoEmpleado.toUpperCase()}` : formatoService.capitalizarPrimeraLetra(gastoDescripcion),
        importe: gastoImporte,
        formaPago: gastoFormaPago,
        cajaId: gastoCajaId,
        usuarioId: (session?.user as any)?.id,
        proveedorId: gastoProveedorId || null,
        comprobante: formatoService.capitalizarPalabras(gastoComprobante) || null,
        empleado: gastoTipo === "SUELDO" ? gastoEmpleado.toUpperCase() : null,
        desde: gastoDesde || null,
        hasta: gastoHasta || null,
        fecha: gastoFecha,
      }),
    });
    if (res.ok) {
      setMostrarGasto(false); resetGasto(); await cargar();
    } else {
      setErrGasto("Error al registrar el gasto");
    }
    setGuardandoGasto(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center p-40">
        <div className="text-gray-400 font-bold text-sm animate-pulse uppercase tracking-widest">Cargando tesorería...</div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <RoleGuard allowedRoles={["ADMIN", "JEFE", "ADMINISTRACION"]}>
      <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/dashboard" className="hidden md:flex p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-xl transition-all">
              <ArrowLeft size={24} />
            </Link>
            <div className="pl-10 lg:pl-0">
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">ServiNOA</p>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight">Tesorería</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => {
                setCutoffMode(!cutoffMode);
                cargar(true);
              }}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-bold transition-all shadow-sm ${
                cutoffMode 
                  ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500 ring-offset-1" 
                  : "bg-white text-gray-600 border border-gray-200 hover:border-blue-500 hover:text-blue-600"
              }`}
            >
              <Clock size={14} />
              <span className="hidden sm:inline">{cutoffMode ? "Modo Corte: 10/04" : "Ver al Corte"}</span>
            </button>
            <button
              onClick={() => { resetCobro(); setMostrarCobro(true); }}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-emerald-700 transition-all shadow-md"
            >
              <ArrowUpRight size={14} /> <span className="hidden sm:inline">Nuevo</span> cobro
            </button>
            <button
              onClick={() => { resetGasto(); setMostrarGasto(true); }}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-red-600 text-white rounded-xl text-[10px] md:text-xs font-bold hover:bg-red-700 transition-all shadow-md"
            >
              <ArrowDownRight size={14} /> <span className="hidden sm:inline">Nuevo</span> gasto
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8 md:space-y-10">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total en cajas</p>
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                <Wallet size={18} className="text-gray-500" />
              </div>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${totalCajas >= 0 ? "text-gray-900" : "text-red-600"}`}>
              ${totalCajas.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">{cajas.length} cajas activas</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cobros del mes</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">
              ${totalCobrosMes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Total recaudado este mes</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gastos del mes</p>
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown size={18} className="text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums text-red-600">
              ${totalGastosMes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Total egresos este mes</p>
          </div>

          <div className={`rounded-2xl shadow-sm p-6 ${resultadoMes >= 0 ? "bg-emerald-600" : "bg-red-600"}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Resultado del mes</p>
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <DollarSign size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums text-white">
              {resultadoMes >= 0 ? "+" : ""}${resultadoMes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-white/60 mt-1">{resultadoMes >= 0 ? "Superávit" : "Déficit"} operativo</p>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

          {/* Columna izquierda */}
          <div className="lg:col-span-7 space-y-8">

            {/* Cajas */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-2">
                  <Wallet size={16} className="text-red-600" /> Cajas
                </h2>
                <Link href="/cajas" className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                  Ver detalle <ChevronRight size={14} />
                </Link>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cajas.map(c => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/cajas/${c.id}`)}
                    className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-left hover:border-red-200 hover:bg-white transition-all group"
                  >
                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate mb-1">{c.nombre}</p>
                    <p className={`text-base font-bold tabular-nums ${c.saldo >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      ${c.saldo.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Últimos movimientos */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-2">
                  <Receipt size={16} className="text-red-600" /> Últimos movimientos
                </h2>
                <div className="flex gap-3">
                  <Link href="/cobranzas" className="text-[10px] font-bold text-emerald-600 hover:underline">Cobros</Link>
                  <Link href="/gastos" className="text-[10px] font-bold text-red-600 hover:underline">Gastos</Link>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {movimientos.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-10">Sin movimientos registrados</p>
                )}
                {movimientos.slice(0, 10).map(m => (
                  <div
                    key={`${m.origen}-${m.id}`}
                    className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.origen === "INGRESO" ? "bg-emerald-50" : "bg-red-50"}`}>
                      {m.origen === "INGRESO"
                        ? <ArrowUpRight size={16} className="text-emerald-600" />
                        : <ArrowDownRight size={16} className="text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 uppercase truncate">
                        {m.cliente ? `${m.cliente} — ` : ""}{m.descripcion}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatFecha(m.fecha)}
                        {m.caja ? ` · ${m.caja}` : ""}
                      </p>
                    </div>
                    <p className={`text-sm font-bold tabular-nums shrink-0 ${m.origen === "INGRESO" ? "text-emerald-600" : "text-red-600"}`}>
                      {m.origen === "INGRESO" ? "+" : "-"}${m.importe.toLocaleString("es-AR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="lg:col-span-5 space-y-8">

            {/* Cobros pendientes */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-red-600" />
                <h2 className="text-sm font-bold text-gray-900 uppercase flex-1">Cobros pendientes</h2>
                {cobrosP.length > 0 && (
                  <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{cobrosP.length}</span>
                )}
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {cobrosP.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Sin cobros pendientes</p>
                ) : cobrosP.map(p => (
                  <div key={p.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 uppercase truncate">
                        {p.cliente?.empresa?.nombre || p.cliente?.nombre}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Ppto #{p.numero} · Saldo: ${p.saldo.toLocaleString("es-AR")}
                      </p>
                    </div>
                    <button
                      onClick={() => abrirFormCobro(p)}
                      className="shrink-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl hover:bg-emerald-700 transition-all uppercase"
                    >
                      Cobrar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cheques a vencer */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Clock size={16} className="text-red-600" />
                <h2 className="text-sm font-bold text-gray-900 uppercase flex-1">Cheques a vencer</h2>
                {cheques.length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">{cheques.length}</span>
                )}
                <Link href="/cheques" className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight size={12} />
                </Link>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {cheques.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Sin cheques próximos a vencer</p>
                ) : cheques.map(c => (
                  <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {c.librador || c.cliente?.nombre || "Sin librador"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{c.banco || "Sin banco"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 tabular-nums">${c.importe.toLocaleString("es-AR")}</p>
                      <p className={`text-[10px] font-bold ${(c.diasVencimiento ?? 0) < 0 ? "text-red-600" : (c.diasVencimiento ?? 0) <= 7 ? "text-amber-600" : "text-gray-400"}`}>
                        {c.vencimientoTexto || (c.fechaCobro ? formatFecha(c.fechaCobro) : "")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Drawer: Nuevo Cobro ─────────────────────────────────────────────── */}
      <Drawer
        isOpen={mostrarCobro}
        onClose={() => { setMostrarCobro(false); resetCobro(); }}
        title="Registrar cobro"
        width="max-w-lg"
      >
        <div className="space-y-5">
          {errCobro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold">
              <AlertTriangle size={14} /> {errCobro}
            </div>
          )}

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Tipo</label>
            <div className="flex gap-2">
              {(["PRESUPUESTO", "COBRANZA_VARIA"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setCobroTipo(t); setCobroPptoId(""); setCobroPptoInfo(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${cobroTipo === t ? "bg-red-600 text-white border-red-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {t === "PRESUPUESTO" ? "Presupuesto" : "Cobro vario"}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Cliente</label>
            <select
              value={cobroClienteId}
              onChange={e => { setCobroClienteId(e.target.value); setCobroPptoId(""); setCobroPptoInfo(null); }}
              className={selectCls}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.empresa ? `${c.empresa.nombre} — ${c.nombre}` : c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Presupuesto o descripción */}
          {cobroTipo === "PRESUPUESTO" ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Presupuesto</label>
              {cobroPptoInfo && !cobroClienteId ? (
                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 uppercase">
                  Ppto #{cobroPptoInfo.numero} — Saldo: ${cobroPptoInfo.saldo.toLocaleString("es-AR")}
                </div>
              ) : (
                <select
                  value={cobroPptoId}
                  onChange={e => {
                    setCobroPptoId(e.target.value);
                    const p = pptosDeCiente.find(x => x.id === e.target.value) || null;
                    setCobroPptoInfo(p);
                    if (p) setCobroImporte(p.saldo.toString());
                  }}
                  className={selectCls}
                >
                  <option value="">Seleccionar presupuesto...</option>
                  {pptosDeCiente.map(p => (
                    <option key={p.id} value={p.id}>Ppto #{p.numero} — Saldo: ${p.saldo.toLocaleString("es-AR")}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Descripción *</label>
              <input
                type="text"
                value={cobroDescripcion}
                onChange={e => setCobroDescripcion(formatoService.capitalizarPrimeraLetra(e.target.value))}
                placeholder="Motivo del cobro..."
                className={inputCls}
              />
            </div>
          )}

          {/* Info saldo presupuesto */}
          {cobroPptoInfo && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Total</p>
                <p className="text-xs font-bold text-gray-900 tabular-nums">${cobroPptoInfo.total.toLocaleString("es-AR")}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Cobrado</p>
                <p className="text-xs font-bold text-emerald-600 tabular-nums">${cobroPptoInfo.cobrado.toLocaleString("es-AR")}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Saldo</p>
                <p className="text-xs font-bold text-red-600 tabular-nums">${cobroPptoInfo.saldo.toLocaleString("es-AR")}</p>
              </div>
            </div>
          )}

          {/* Importe */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Importe *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">$</span>
              <input
                type="number" min="0" step="0.01"
                value={cobroImporte} onChange={e => setCobroImporte(e.target.value)}
                placeholder="0.00"
                className={inputCls + " pl-8"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Forma de pago */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Forma de pago</label>
              <select value={cobroFormaPago} onChange={e => setCobroFormaPago(e.target.value)} className={selectCls}>
                {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Fecha</label>
              <input type="date" value={cobroFecha} onChange={e => setCobroFecha(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Caja destino */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Caja destino *</label>
            <select value={cobroCajaId} onChange={e => setCobroCajaId(e.target.value)} className={selectCls}>
              {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Datos cheque */}
          {cobroFormaPago === "Cheque" && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos del cheque</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="N° de cheque" value={chqNumero} onChange={e => setChqNumero(formatoService.capitalizarPalabras(e.target.value))}
                  className={inputCls} />
                <input type="text" placeholder="Banco emisor" value={chqBanco} onChange={e => setChqBanco(formatoService.capitalizarPalabras(e.target.value))}
                  className={inputCls} />
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fecha emisión</label>
                  <input type="date" value={chqEmision} onChange={e => setChqEmision(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fecha cobro</label>
                  <input type="date" value={chqCobro} onChange={e => setChqCobro(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={guardarCobro}
            disabled={guardandoCobro}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Save size={16} /> {guardandoCobro ? "Guardando..." : "Confirmar cobro"}
          </button>
        </div>
      </Drawer>

      {/* ── Drawer: Nuevo Gasto ─────────────────────────────────────────────── */}
      <Drawer
        isOpen={mostrarGasto}
        onClose={() => { setMostrarGasto(false); resetGasto(); }}
        title="Registrar gasto"
        width="max-w-lg"
      >
        <div className="space-y-5">
          {errGasto && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold">
              <AlertTriangle size={14} /> {errGasto}
            </div>
          )}

          {/* Tipo */}
          <div className="space-y-1.5">
             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Categoría de Egreso</label>
             <select 
               value={gastoTipo} onChange={e => setGastoTipo(e.target.value as any)}
               className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none cursor-pointer uppercase appearance-none"
             >
                {TIPOS_GASTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
             </select>
          </div>

          {gastoTipo !== "SUELDO" ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Proveedor (opcional)</label>
                <ProveedorQuickAdd
                  value={gastoProveedorId}
                  proveedores={proveedores}
                  onChange={setGastoProveedorId}
                  onCreated={(p) => setProveedores(prev => [...prev, p].sort((a, b) => a.nombre.localeCompare(b.nombre)))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Descripción *</label>
                <textarea
                  value={gastoDescripcion}
                  onChange={e => setGastoDescripcion(formatoService.capitalizarPrimeraLetra(e.target.value))}
                  placeholder="Detalle el motivo del gasto..."
                  className={inputCls + " min-h-[70px] resize-none"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Comprobante (opcional)</label>
                <input
                  type="text" value={gastoComprobante} onChange={e => setGastoComprobante(formatoService.capitalizarPalabras(e.target.value))}
                  placeholder="Factura, recibo, etc..."
                  className={inputCls}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Operador / Beneficiario *</label>
                <select value={gastoEmpleado} onChange={(e) => setGastoEmpleado(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl text-sm font-bold outline-none uppercase cursor-pointer appearance-none">
                   <option value="">Seleccione personal...</option>
                   {usuarios.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Período desde</label>
                  <input type="date" value={gastoDesde} onChange={e => setGastoDesde(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Período hasta</label>
                  <input type="date" value={gastoHasta} onChange={e => setGastoHasta(e.target.value)} className={inputCls} />
                </div>
              </div>
            </>
          )}

          {/* Importe */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Importe *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">$</span>
              <input
                type="number" min="0" step="0.01"
                value={gastoImporte} onChange={e => setGastoImporte(e.target.value)}
                placeholder="0.00"
                className={inputCls + " pl-8"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Forma de pago */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Forma de pago</label>
              <select value={gastoFormaPago} onChange={e => setGastoFormaPago(e.target.value)} className={selectCls}>
                {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Fecha</label>
              <input type="date" value={gastoFecha} onChange={e => setGastoFecha(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Caja origen */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-red-600 uppercase tracking-widest block">Caja origen *</label>
            <select value={gastoCajaId} onChange={e => setGastoCajaId(e.target.value)} className={selectCls + " border-red-200 focus:border-red-600"}>
              {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <button
            onClick={guardarGasto}
            disabled={guardandoGasto}
            className="w-full bg-red-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Save size={16} /> {guardandoGasto ? "Guardando..." : "Confirmar gasto"}
          </button>
        </div>
      </Drawer>

    </div>
    </RoleGuard>
  );
}
