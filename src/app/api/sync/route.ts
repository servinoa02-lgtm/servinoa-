import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

const SHEET_ID = "1qmGn4kUoyKg8Hzr6Px65CPAWKRQ2ebWKoQUnThxb8xw";
const SHEET_BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;

async function fetchSheet(name: string): Promise<Record<string, string>[]> {
  const res = await fetch(SHEET_BASE + encodeURIComponent(name), { cache: "no-store" });
  if (!res.ok) throw new Error(`Error al descargar hoja "${name}": ${res.status}`);
  return parseCsv(await res.text());
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cell += ch;
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ',') {
      row.push(cell); cell = "";
    } else if (ch === '\n') {
      row.push(cell); rows.push(row); row = []; cell = "";
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ""))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

function mapNumero(str: string): number | null {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return parseInt(parts[0].slice(2) + parts[1]);
}

function mapEstadoPresupuesto(str: string) {
  const s = (str || "").toLowerCase().trim();
  if (s === "aprobado")       return "APROBADO" as const;
  if (s === "presupuestado")  return "PRESUPUESTADO" as const;
  if (s === "rechazado")      return "RECHAZADO" as const;
  return "BORRADOR" as const;
}

function mapEstadoCheque(str: string) {
  const s = (str || "").toLowerCase().trim();
  if (s === "depositado")          return "DEPOSITADO" as const;
  if (s === "endosado")            return "ENDOSADO" as const;
  if (s === "pendiente de cobro")  return "EN_CARTERA" as const;
  return "EN_CARTERA" as const;
}

export async function POST() {
  const sesion = await requireAuth(["ADMIN"]);
  if (sesion instanceof NextResponse) return sesion;

  const start = Date.now();

  try {
    // ── Descarga de hojas ─────────────────────────────────────────────────
    const [
      clienteRows, presupuestosRows, descripcionRows, cobranzasRows,
      gastosRows, cajaRows, chequesRows, transferenciasRows,
      usuarioCajaRows, formaPagoRows,
      otRows, maquinaRows, marcaRows, modeloRows, tecnicoRows, fallaRows,
    ] = await Promise.all([
      fetchSheet("Cliente"), fetchSheet("Presupuestos"), fetchSheet("Descripcion"),
      fetchSheet("Cobranzas"), fetchSheet("Gastos"), fetchSheet("Caja"),
      fetchSheet("Cheques"), fetchSheet("TransferenciaDeCaja"),
      fetchSheet("UsuarioCaja"), fetchSheet("FormaDePago"),
      fetchSheet("OT"), fetchSheet("XMaquina"), fetchSheet("XMarca"),
      fetchSheet("XModelo"), fetchSheet("Tecnico"), fetchSheet("Falla"),
    ]);

    // ── Mapas de lookup ───────────────────────────────────────────────────
    const cajaNombreById  = Object.fromEntries(usuarioCajaRows.map(r => [r.IdUsuarioCaja, r.UsuarioCaja]));
    const formaPagoById   = Object.fromEntries(formaPagoRows.map(r => [r.IDFormaDePago, r.FormaDePago]));

    function resolveFormaPago(val: string) {
      if (!val) return "Efectivo";
      if (formaPagoById[val]) return formaPagoById[val];
      const lv = val.toLowerCase();
      for (const name of Object.values(formaPagoById)) {
        if (name.toLowerCase() === lv) return name;
      }
      return val;
    }

    function resolveCajaNombre(val: string) {
      return cajaNombreById[val] || val || null;
    }

    const cajasDb = await prisma.caja.findMany();
    const cajaIdByNombre = Object.fromEntries(cajasDb.map(c => [c.nombre.toLowerCase(), c.id]));

    function getCajaId(val: string): string | null {
      const nombre = resolveCajaNombre(val);
      return nombre ? (cajaIdByNombre[nombre.toLowerCase()] ?? null) : null;
    }

    const adminUser = await prisma.usuario.findFirst({
      where: { rol: "ADMIN" },
      orderBy: { createdAt: "asc" },
    });
    if (!adminUser) throw new Error("No se encontró un usuario ADMIN en la base de datos.");

    // Mapas para OTs
    const maquinaMap = Object.fromEntries(maquinaRows.map(r => [r['ID Maquina'], r.Maquina]));
    const marcaMap   = Object.fromEntries(marcaRows.map(r => [r.IDMarca, r.Marca]));
    const modeloMap  = Object.fromEntries(modeloRows.map(r => [r.IDModelo, r.Modelo]));
    const tecnicoMap = Object.fromEntries(tecnicoRows.map(r => [r.IDTecnico, r.Nombre]));
    const fallaMap   = Object.fromEntries(fallaRows.map(r => [r.ID, r.Falla]));

    function mapEstadoOT(str: string) {
      const s = (str || '').toLowerCase().trim();
      if (s.includes('entregada realizada'))     return 'ENTREGADO_REALIZADO' as const;
      if (s.includes('entregada sin realizar'))  return 'ENTREGADO_SIN_REALIZAR' as const;
      if (s.includes('rechazada'))               return 'RECHAZADO' as const;
      if (s.includes('sin reparación'))          return 'RECHAZADO' as const;
      if (s.includes('reparada'))                return 'REPARADO' as const;
      if (s.includes('pertenece a servinoa'))    return 'ENTREGADO_REALIZADO' as const;
      if (s.includes('eliminada'))               return 'RECHAZADO' as const;
      return 'ENTREGADO_REALIZADO' as const;
    }

    // ── Limpieza ──────────────────────────────────────────────────────────
    await prisma.cuentaCorriente.deleteMany();
    await prisma.movimientoCaja.deleteMany();
    await prisma.transferenciaCaja.deleteMany();
    await prisma.itemPresupuesto.deleteMany();
    await prisma.cobranza.deleteMany();
    await prisma.gasto.deleteMany();
    await prisma.cheque.deleteMany();
    await prisma.presupuesto.deleteMany();
    await prisma.historialOT.deleteMany();
    await prisma.nota.deleteMany();
    await prisma.foto.deleteMany();
    await prisma.retiro.deleteMany();
    await prisma.ordenTrabajo.deleteMany();
    await prisma.modelo.deleteMany();
    await prisma.marca.deleteMany();
    await prisma.maquina.deleteMany();
    await prisma.cliente.deleteMany();

    // ── Clientes ──────────────────────────────────────────────────────────
    await prisma.cliente.createMany({
      data: clienteRows.filter(r => r.IDCLIENTE).map(r => ({
        nombre:      r.Nombre || "Sin nombre",
        dni:         r.DNI    || null,
        email:       r.mail   || null,
        domicilio:   r.domicilio || null,
        telefono:    r.telefono  || null,
        iva:         r.IVA    || "NO incluyen IVA",
        codigoExcel: r.IDCLIENTE,
      })),
    });
    const clientesDb = await prisma.cliente.findMany({ select: { id: true, codigoExcel: true } });
    const clienteMap = Object.fromEntries(clientesDb.map(c => [c.codigoExcel!, c.id]));

    // ── Catálogo de equipos ───────────────────────────────────────────────
    const maquinasUnicas = Array.from(new Set(Object.values(maquinaMap))).filter(Boolean) as string[];
    await Promise.all(maquinasUnicas.map(m => 
      prisma.maquina.upsert({ where: { nombre: m }, update: {}, create: { nombre: m } })
    ));
    const maquinasDb = await prisma.maquina.findMany();
    const maquinaIdByName = Object.fromEntries(maquinasDb.map(m => [m.nombre, m.id]));

    for (const row of marcaRows) {
      const maqId = maquinaIdByName[maquinaMap[row.Maquina]];
      if (row.Marca && maqId) {
        await prisma.marca.upsert({
          where: { nombre_maquinaId: { nombre: row.Marca, maquinaId: maqId } },
          update: {}, create: { nombre: row.Marca, maquinaId: maqId }
        });
      }
    }
    const marcasDb = await prisma.marca.findMany();
    const marcaIdByNameMaq = Object.fromEntries(marcasDb.map(m => [`${m.nombre}-${m.maquinaId}`, m.id]));

    for (const row of modeloRows) {
      const marcaId = marcasDb.find(m => m.nombre === marcaMap[row.Marca])?.id;
      if (row.Modelo && marcaId) {
        await prisma.modelo.upsert({
          where: { nombre_marcaId: { nombre: row.Modelo, marcaId: marcaId } },
          update: {}, create: { nombre: row.Modelo, marcaId: marcaId }
        });
      }
    }
    const modelosDb = await prisma.modelo.findMany();
    const modeloIdByNameMarca = Object.fromEntries(modelosDb.map(m => [`${m.nombre}-${m.marcaId}`, m.id]));

    // ── Órdenes de Trabajo (OT) - Inserción Masiva ────────────────────────
    const otData = otRows.map(row => {
      const numStr = row.OTN || '';
      const numero = parseInt(numStr.replace('OT-', ''));
      if (isNaN(numero)) return null;

      const maqName = maquinaMap[row.Maquina];
      const marName = marcaMap[row.Marca];
      const modName = modeloMap[row.Modelo];
      const maquinaId = maquinaIdByName[maqName] || null;
      const marcaId = maquinaId ? (marcaIdByNameMaq[`${marName}-${maquinaId}`] || null) : null;
      const modeloId = marcaId ? (modeloIdByNameMarca[`${modName}-${marcaId}`] || null) : null;

      return {
        numero,
        fechaRecepcion: parseDate(row['Fecha de recep']) || parseDate(row['Fecha de recepcion']) || new Date(),
        estado:         mapEstadoOT(row.Estado),
        falla:          fallaMap[row.Falla] || row.Falla || null,
        observaciones:  row.Observaciones || null,
        nroSerie:       row['N° de Serie'] || null,
        accesorios:     row.Check || null,
        clienteId:      clienteMap[row.Cliente] || '',
        creadorId:      adminUser.id,
        maquinaId, marcaId, modeloId,
      };
    }).filter(Boolean) as any[];

    await prisma.ordenTrabajo.createMany({ data: otData });
    const otsDb = await prisma.ordenTrabajo.findMany({ select: { id: true, numero: true } });
    const otNumeroMap = Object.fromEntries(otsDb.map(o => [`OT-${o.numero}`, o.id]));

    // ── Cheques ───────────────────────────────────────────────────────────
    await prisma.cheque.createMany({
      data: chequesRows.filter(r => r.IdCheques).map(row => ({
        estado:       mapEstadoCheque(row.EstadoCheque),
        numeroCheque: row.NumeroDeCheque || null,
        banco:        row.Banco    || null,
        librador:     row.Librador || null,
        importe:      parseFloat(row.Importe) || 0,
        fechaIngreso: parseDate(row.FechaDeIngreso) || new Date(),
        fechaEmision: parseDate(row.FechaDeEmision),
        fechaCobro:   parseDate(row.FechaDeCobro),
        endosadoA:    row.EndosadoA || null,
        descripcion:  row["Descripción"] || row["Descripcion"] || null,
        clienteId:    clienteMap[row.Cliente] || null,
      }))
    });
    const chequesDb = await prisma.cheque.findMany({ select: { id: true, importe: true, numeroCheque: true } });
    const chequeMap: Record<string, string> = {}; 
    chequesRows.forEach(row => {
      const match = chequesDb.find(c => c.importe === parseFloat(row.Importe) && c.numeroCheque === row.NumeroDeCheque);
      if (match) chequeMap[row.IdCheques] = match.id;
    });

    // ── Presupuestos ──────────────────────────────────────────────────────
    type PptoData = {
      _key: string; numero: number; incluyeIva: boolean; fecha: Date;
      estado: "APROBADO" | "PRESUPUESTADO" | "RECHAZADO" | "BORRADOR";
      estadoCobro: "PENDIENTE"; facturaNumero: string | null;
      observaciones: string | null; formaPago: string; validezDias: number;
      moneda: string; clienteId: string; usuarioId: string;
    };

    const presupuestosData: PptoData[] = presupuestosRows
      .flatMap(row => {
        const numero = parseInt(row.Numero) || mapNumero(row.Num_Presupuesto);
        const clienteId = clienteMap[row.Cliente];
        if (!numero || !clienteId) return [];
        const incluyeIva = (row.INCLUYE_IVA || "").trim() === "Incluyen IVA";
        const ordenId = otNumeroMap[row.Num_OT] || null;

        return [{
          _key: row.Num_Presupuesto,
          numero, incluyeIva,
          fecha:         parseDate(row.Fecha) || new Date(),
          estado:        mapEstadoPresupuesto(row.Estado),
          estadoCobro:   "PENDIENTE" as const,
          facturaNumero: row.FacturaNumero || null,
          observaciones: row.Observaciones || null,
          formaPago:     row.Forma_PAGO || "Contado",
          validezDias:   parseInt(row.VALIDEZ_OFERTA) || 7,
          moneda:        "ARS",
          clienteId,
          ordenId,
          usuarioId:     adminUser.id,
        }];
      });

    await prisma.presupuesto.createMany({
      data: presupuestosData.map(({ _key: _, ...d }) => d),
    });

    const pptosDb = await prisma.presupuesto.findMany({ select: { id: true, numero: true } });
    const pptoIdByNumero = Object.fromEntries(pptosDb.map(p => [p.numero, p.id]));
    const presupuestoMap = Object.fromEntries(
      presupuestosData.map(p => [p._key, pptoIdByNumero[p.numero]])
    );

    // ── Items ─────────────────────────────────────────────────────────────
    const itemsData = descripcionRows
      .filter(r => r.NUM_Presupuesto && presupuestoMap[r.NUM_Presupuesto])
      .map(r => ({
        cantidad:      parseInt(r.Cantidad) || 1,
        descripcion:   r.Descripcion || "Sin descripción",
        precio:        parseFloat(r.Precio) || 0,
        total:         parseFloat(r.Total)  || 0,
        presupuestoId: presupuestoMap[r.NUM_Presupuesto],
      }));
    await prisma.itemPresupuesto.createMany({ data: itemsData });

    // ── Cobranzas ─────────────────────────────────────────────────────────
    const cobranzasData = cobranzasRows
      .map(row => {
        const cajaId = getCajaId(row.UsuarioCaja);
        if (!cajaId) return null;
        return {
          tipo:          (row.Tipo || "").toLowerCase().includes("varia") ? "COBRANZA_VARIA" as const : "PRESUPUESTO" as const,
          fecha:         parseDate(row.Fecha) || new Date(),
          descripcion:   row.Descripcion || null,
          importe:       parseFloat(row.Importe) || 0,
          formaPago:     resolveFormaPago(row.FormaDePago),
          clienteId:     clienteMap[row.Cliente] || null,
          presupuestoId: presupuestoMap[row.PresupuestoCobrado] || null,
          cajaId, usuarioId: adminUser.id,
          chequeId:      row.IDCheque ? (chequeMap[row.IDCheque] ?? null) : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    await prisma.cobranza.createMany({ data: cobranzasData });

    // Actualizar estadoCobro
    const cobranzasPorPpto = await prisma.cobranza.groupBy({
      by: ["presupuestoId"],
      _sum: { importe: true },
      where: { presupuestoId: { not: null } },
    });
    const cobradoByPptoId = Object.fromEntries(
      cobranzasPorPpto.map(r => [r.presupuestoId!, r._sum.importe ?? 0])
    );
    const pptosConItems = await prisma.presupuesto.findMany({
      select: { id: true, incluyeIva: true, items: { select: { total: true } } },
    });
    for (const p of pptosConItems) {
      const subtotal = p.items.reduce((s, i) => s + i.total, 0);
      const total    = p.incluyeIva ? subtotal * 1.21 : subtotal;
      const cobrado  = cobradoByPptoId[p.id] ?? 0;
      let estadoCobro: "COBRADO" | "PARCIAL" | undefined;
      if (total > 0 && cobrado >= total * 0.99) estadoCobro = "COBRADO";
      else if (cobrado > 0) estadoCobro = "PARCIAL";
      if (estadoCobro) await prisma.presupuesto.update({ where: { id: p.id }, data: { estadoCobro } });
    }

    // ── Gastos ────────────────────────────────────────────────────────────
    const gastosData = gastosRows
      .map(row => {
        const cajaId = getCajaId(row.UsuarioCaja);
        if (!cajaId) return null;
        return {
          tipo:        (row.Tipo || "").toLowerCase() === "sueldo" ? "SUELDO" as const : "GASTO_VARIOS" as const,
          fecha:       parseDate(row.Fecha) || new Date(),
          descripcion: row.Descripcion || row.NumRecibo || "Sin descripción",
          importe:     parseFloat(row.Importe) || 0,
          formaPago:   resolveFormaPago(row.FormaDePago),
          comprobante: row.Comprobante || null,
          empleado:    row.Empleado   || null,
          desde:       parseDate(row.Desde),
          hasta:       parseDate(row.Hasta),
          cajaId, usuarioId: adminUser.id,
          chequeId:    row.IDCheque ? (chequeMap[row.IDCheque] ?? null) : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    await prisma.gasto.createMany({ data: gastosData });

    // ── Movimientos de Caja ───────────────────────────────────────────────
    const movimientosData = cajaRows
      .filter(row => resolveCajaNombre(row.UsuarioCaja) !== "Cheques")
      .map(row => {
        const cajaId = getCajaId(row.UsuarioCaja);
        if (!cajaId) return null;
        return {
          fecha:       parseDate(row.Fecha) || new Date(),
          descripcion: row.Descripcion || "-",
          ingreso:     parseFloat(row.Ingreso) || 0,
          egreso:      parseFloat(row["Egreso"]) || 0,
          formaPago:   resolveFormaPago(row.FormaDePago),
          cajaId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const cajaCheques = cajaIdByNombre["cheques"];
    if (cajaCheques) {
      const enCartera = await prisma.cheque.findMany({ where: { estado: "EN_CARTERA" } });
      for (const ch of enCartera) {
        movimientosData.push({
          fecha:       ch.fechaIngreso,
          descripcion: `Cheque: ${ch.librador || ""}${ch.numeroCheque ? " - N°" + ch.numeroCheque : ""}`.trim(),
          ingreso:     ch.importe,
          egreso:      0,
          formaPago:   "Cheques",
          cajaId:      cajaCheques,
        });
      }
    }
    await prisma.movimientoCaja.createMany({ data: movimientosData });

    // ── Transferencias ────────────────────────────────────────────────────
    const transferenciasData = transferenciasRows
      .map(row => {
        const cajaOrigenId  = getCajaId(row.UsuarioCajaOrigen);
        const cajaDestinoId = getCajaId(row.UsuarioCajaDestino);
        if (!cajaOrigenId || !cajaDestinoId) return null;
        return {
          fecha:            parseDate(row.Fecha) || new Date(),
          monto:            parseFloat(row.Monto) || 0,
          descripcion:      row.Descripcion || null,
          formaPagoOrigen:  resolveFormaPago(row.FormaDePagoOrigen),
          formaPagoDestino: resolveFormaPago(row.FormaDePagoDestino),
          cajaOrigenId, cajaDestinoId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    await prisma.transferenciaCaja.createMany({ data: transferenciasData });

    // Resetear secuencia de autoincrement
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"Presupuesto"', 'numero'),
        COALESCE((SELECT MAX(numero) FROM "Presupuesto"), 0) + 1
      )
    `);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    return NextResponse.json({
      ok: true,
      duracion: `${elapsed}s`,
      totales: {
        clientes:      clientesDb.length,
        ordenes:       Object.keys(otNumeroMap).length,
        presupuestos:  presupuestosData.length,
        items:         itemsData.length,
        cobranzas:     cobranzasData.length,
        gastos:        gastosData.length,
        movimientos:   movimientosData.length,
        cheques:       Object.keys(chequeMap).length,
        transferencias: transferenciasData.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Error desconocido" },
      { status: 500 }
    );
  }
}
