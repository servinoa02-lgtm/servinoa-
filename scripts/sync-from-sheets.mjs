/**
 * sync-from-sheets.mjs
 * Sincroniza los datos desde el Google Sheet (sistema viejo) a la base de datos de ServiNOA.
 * Estrategia: wipe + reimport completo de todos los datos migrados.
 * NO toca: Usuarios, Cajas (las 8 fijas).
 *
 * Uso: npm run sync
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env.local') })

const prisma = new PrismaClient()

const SHEET_ID = '1qmGn4kUoyKg8Hzr6Px65CPAWKRQ2ebWKoQUnThxb8xw'
const SHEET_BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`

// ─── CSV / fetch ──────────────────────────────────────────────────────────────

async function fetchSheet(name) {
  const url = SHEET_BASE + encodeURIComponent(name)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error al descargar hoja "${name}": ${res.status}`)
  return parseCsv(await res.text())
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuote = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') inQuote = false
      else cell += ch
    } else if (ch === '"') {
      inQuote = true
    } else if (ch === ',') {
      row.push(cell); cell = ''
    } else if (ch === '\n') {
      row.push(cell); rows.push(row); row = []; cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row) }
  if (!rows.length) return []

  const headers = rows[0].map(h => h.trim())
  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ''))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
}

// ─── Helpers de conversión ────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
  return isNaN(d.getTime()) ? null : d
}

function mapNumero(str) {
  // "2024-0450" → 240450 | "2025-01064" → 2501064
  if (!str) return null
  const parts = str.split('-')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return parseInt(parts[0].slice(2) + parts[1])
}

function mapEstadoPresupuesto(str) {
  const s = (str || '').toLowerCase().trim()
  if (s === 'aprobado')      return 'APROBADO'
  if (s === 'presupuestado') return 'PRESUPUESTADO'
  if (s === 'rechazado')     return 'RECHAZADO'
  return 'BORRADOR'
}

function mapEstadoCheque(str) {
  const s = (str || '').toLowerCase().trim()
  if (s === 'depositado')         return 'DEPOSITADO'
  if (s === 'endosado')           return 'ENDOSADO'
  if (s === 'pendiente de cobro') return 'EN_CARTERA'
  return 'EN_CARTERA'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const start = Date.now()
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   ServiNOA — Sincronización desde Sheets     ║')
  console.log('╚══════════════════════════════════════════════╝\n')

  // ── 1. Descarga de hojas ──────────────────────────────────────────────────
  console.log('📥 Descargando hojas del Google Sheet...')
  const [
    clienteRows,
    presupuestosRows,
    descripcionRows,
    cobranzasRows,
    gastosRows,
    cajaRows,
    chequesRows,
    transferenciasRows,
    usuarioCajaRows,
    formaPagoRows,
    otRows,
    maquinaRows,
    marcaRows,
    modeloRows,
    tecnicoRows,
    fallaRows,
  ] = await Promise.all([
    fetchSheet('Cliente'),
    fetchSheet('Presupuestos'),
    fetchSheet('Descripcion'),
    fetchSheet('Cobranzas'),
    fetchSheet('Gastos'),
    fetchSheet('Caja'),
    fetchSheet('Cheques'),
    fetchSheet('TransferenciaDeCaja'),
    fetchSheet('UsuarioCaja'),
    fetchSheet('FormaDePago'),
    fetchSheet('OT'),
    fetchSheet('XMaquina'),
    fetchSheet('XMarca'),
    fetchSheet('XModelo'),
    fetchSheet('Tecnico'),
    fetchSheet('Falla'),
  ])

  console.log(`   ✓ ${clienteRows.length} clientes`)
  console.log(`   ✓ ${otRows.length} órdenes de trabajo (OTs)`)
  console.log(`   ✓ ${presupuestosRows.length} presupuestos, ${descripcionRows.length} items`)
  console.log(`   ✓ ${cobranzasRows.length} cobranzas`)
  console.log(`   ✓ ${gastosRows.length} gastos`)
  console.log(`   ✓ ${cajaRows.length} movimientos de caja`)
  console.log(`   ✓ ${chequesRows.length} cheques`)
  console.log(`   ✓ ${transferenciasRows.length} transferencias\n`)

  // ── 2. Mapas de lookup ────────────────────────────────────────────────────
  const cajaNombreById = Object.fromEntries(usuarioCajaRows.map(r => [r.IdUsuarioCaja, r.UsuarioCaja]))
  const formaPagoById  = Object.fromEntries(formaPagoRows.map(r => [r.IDFormaDePago, r.FormaDePago]))

  // Mapas para OTs
  const maquinaMap = Object.fromEntries(maquinaRows.map(r => [r['ID Maquina'], r.Maquina]))
  const marcaMap   = Object.fromEntries(marcaRows.map(r => [r.IDMarca, r.Marca]))
  const modeloMap  = Object.fromEntries(modeloRows.map(r => [r.IDModelo, r.Modelo]))
  const tecnicoMap = Object.fromEntries(tecnicoRows.map(r => [r.IDTecnico, r.Nombre]))
  const fallaMap   = Object.fromEntries(fallaRows.map(r => [r.ID, r.Falla]))

  function resolveFormaPago(val) {
    if (!val) return 'Efectivo'
    if (formaPagoById[val]) return formaPagoById[val]
    const lv = val.toLowerCase()
    for (const name of Object.values(formaPagoById)) {
      if (name.toLowerCase() === lv) return name
    }
    return val
  }

  function resolveCajaNombre(val) {
    return cajaNombreById[val] || val || null
  }

  function mapEstadoOT(str) {
    const s = (str || '').toLowerCase().trim()
    if (s.includes('entregada realizada'))     return 'ENTREGADO_REALIZADO'
    if (s.includes('entregada sin realizar'))  return 'ENTREGADO_SIN_REALIZAR'
    if (s.includes('rechazada'))               return 'RECHAZADO'
    if (s.includes('sin reparación'))          return 'RECHAZADO'
    if (s.includes('reparada'))                return 'REPARADO'
    if (s.includes('pertenece a servinoa'))    return 'ENTREGADO_REALIZADO'
    if (s.includes('eliminada'))               return 'RECHAZADO'
    if (s.includes('revisada'))                return 'REVISADO'
    if (s.includes('confirmada'))              return 'APROBADO'
    if (s.includes('presupuestada'))           return 'PRESUPUESTADO'
    if (s.includes('para revisar'))            return 'PARA_REVISAR'
    if (s.includes('para presupuestar'))       return 'PARA_PRESUPUESTAR'
    return 'ENTREGADO_REALIZADO' // Default para datos viejos
  }

  const cajasDb = await prisma.caja.findMany()
  const cajaIdByNombre = Object.fromEntries(cajasDb.map(c => [c.nombre.toLowerCase(), c.id]))

  function getCajaId(val) {
    const nombre = resolveCajaNombre(val)
    return nombre ? (cajaIdByNombre[nombre.toLowerCase()] ?? null) : null
  }

  const adminUser = await prisma.usuario.findFirst({
    where: { rol: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
  })
  if (!adminUser) throw new Error('No se encontró un usuario ADMIN en la base de datos.')

  // ── 3. Limpieza ───────────────────────────────────────────────────────────
  console.log('🗑️  Limpiando datos migrados anteriores...')
  await prisma.cuentaCorriente.deleteMany()
  await prisma.movimientoCaja.deleteMany()
  await prisma.transferenciaCaja.deleteMany()
  await prisma.itemPresupuesto.deleteMany()
  await prisma.cobranza.deleteMany()
  await prisma.gasto.deleteMany()
  await prisma.cheque.deleteMany()
  await prisma.presupuesto.deleteMany()
  await prisma.historialOT.deleteMany()
  await prisma.nota.deleteMany()
  await prisma.foto.deleteMany()
  await prisma.retiro.deleteMany()
  await prisma.ordenTrabajo.deleteMany()
  await prisma.cliente.deleteMany()
  console.log('   Listo.\n')

  // ── 4. Clientes (batch) ───────────────────────────────────────────────────
  console.log('👥 Importando clientes...')
  await prisma.cliente.createMany({
    data: clienteRows
      .filter(r => r.IDCLIENTE)
      .map(r => ({
        nombre:      r.Nombre || 'Sin nombre',
        dni:         r.DNI    || null,
        email:       r.mail   || null,
        domicilio:   r.domicilio || null,
        telefono:    r.telefono  || null,
        iva:         r.IVA    || 'NO incluyen IVA',
        codigoExcel: r.IDCLIENTE,
      })),
  })
  const clientesDb = await prisma.cliente.findMany({ select: { id: true, codigoExcel: true } })
  const clienteMap = Object.fromEntries(clientesDb.map(c => [c.codigoExcel, c.id]))
  console.log(`   ✓ ${clientesDb.length} clientes\n`)

  // ── 4.1 Máquinas, Marcas, Modelos ─────────────────────────────────────────
  // Las insertamos para tener IDs reales si no existen
  console.log('🏗️  Sincronizando catálogo de equipos...')
  const maquinasUnicas = Array.from(new Set(Object.values(maquinaMap))).filter(Boolean)
  await prisma.maquina.createMany({
    data: maquinasUnicas.map(m => ({ nombre: m })),
    skipDuplicates: true,
  })
  const maquinasDb = await prisma.maquina.findMany()
  const maquinaIdByName = Object.fromEntries(maquinasDb.map(m => [m.nombre, m.id]))

  const marcasToCreate = marcaRows
    .map(row => {
      const maqId = maquinaIdByName[maquinaMap[row.IDMaquina]]
      if (row.Marca && maqId) return { nombre: row.Marca, maquinaId: maqId }
      return null
    })
    .filter(Boolean)
  await prisma.marca.createMany({ data: marcasToCreate, skipDuplicates: true })
  const marcasDb = await prisma.marca.findMany()
  const marcaIdByNameMaq = Object.fromEntries(marcasDb.map(m => [`${m.nombre}-${m.maquinaId}`, m.id]))

  const modelosToCreate = modeloRows
    .map(row => {
      const marcaId = marcasDb.find(m => m.nombre === marcaMap[row.IDMarca])?.id
      if (row.Modelo && marcaId) return { nombre: row.Modelo, marcaId }
      return null
    })
    .filter(Boolean)
  await prisma.modelo.createMany({ data: modelosToCreate, skipDuplicates: true })
  const modelosDb = await prisma.modelo.findMany()
  const modeloIdByNameMarca = Object.fromEntries(modelosDb.map(m => [`${m.nombre}-${m.marcaId}`, m.id]))

  // ── 4.2 Órdenes de Trabajo (OT) ───────────────────────────────────────────
  console.log('🛠️  Importando órdenes de trabajo...')
  const otMap = {} // Mapa AppSheet ID -> DB ID
  const otNumeroMap = {} // Mapa "OT-3200" -> DB ID

  for (const row of otRows) {
    const numStr = row.OTN || ''
    const numero = parseInt(numStr.replace('OT-', ''))
    if (isNaN(numero)) continue

    const maqName = maquinaMap[row.Maquina]
    const marName = marcaMap[row.Marca]
    const modName = modeloMap[row.Modelo]
    
    const maquinaId = maquinaIdByName[maqName] || null
    const marcaId = maquinaId ? (marcaIdByNameMaq[`${marName}-${maquinaId}`] || null) : null
    const modeloId = marcaId ? (modeloIdByNameMarca[`${modName}-${marcaId}`] || null) : null

    const ot = await prisma.ordenTrabajo.create({
      data: {
        numero,
        fechaRecepcion: parseDate(row['Fecha de recep']) || parseDate(row['Fecha de recepcion']) || new Date(),
        estado:         mapEstadoOT(row.Estado),
        falla:          fallaMap[row.Falla] || row.Falla || null,
        observaciones:  row.Observaciones || null,
        nroSerie:       row['N° de Serie'] || null,
        accesorios:     row.Check || null,
        clienteId:      clienteMap[row.Cliente] || '',
        creadorId:      adminUser.id,
        maquinaId,
        marcaId,
        modeloId,
      }
    })
    otMap[row.OTN] = ot.id
    otNumeroMap[numStr] = ot.id
  }
  console.log(`   ✓ ${Object.keys(otMap).length} OTs\n`)

  // ── 5. Cheques (individual para construir el mapa AppSheet→DB) ────────────
  // Son pocos (64). Necesitamos el mapa para vincular cobranzas y gastos.
  console.log('🏷️  Importando cheques...')
  const chequeMap = {}
  for (const row of chequesRows) {
    if (!row.IdCheques) continue
    const desc = row['Descripción'] || row['Descripcion'] || null
    const ch = await prisma.cheque.create({
      data: {
        estado:       mapEstadoCheque(row.EstadoCheque),
        numeroCheque: row.NumeroDeCheque || null,
        banco:        row.Banco    || null,
        librador:     row.Librador || null,
        importe:      parseFloat(row.Importe) || 0,
        fechaIngreso: parseDate(row.FechaDeIngreso) || new Date(),
        fechaEmision: parseDate(row.FechaDeEmision),
        fechaCobro:   parseDate(row.FechaDeCobro),
        endosadoA:    row.EndosadoA || null,
        descripcion:  desc,
        clienteId:    clienteMap[row.Cliente] || null,
      },
    })
    chequeMap[row.IdCheques] = ch.id
  }
  console.log(`   ✓ ${Object.keys(chequeMap).length} cheques\n`)

  // ── 6. Presupuestos (batch) ───────────────────────────────────────────────
  console.log('📋 Importando presupuestos...')
  const presupuestosData = presupuestosRows
    .map(row => {
      // Usamos el número secuencial si existe, sino caemos al mapeo anterior
      const numero = parseInt(row.Numero) || mapNumero(row.Num_Presupuesto)
      const clienteId = clienteMap[row.Cliente]
      if (!numero || !clienteId) return null
      
      const incluyeIva = (row.INCLUYE_IVA || '').trim() === 'Incluyen IVA'
      const ordenId = otNumeroMap[row.Num_OT] || null

      return {
        _key: row.Num_Presupuesto,
        numero,
        fecha:         parseDate(row.Fecha) || new Date(),
        estado:        mapEstadoPresupuesto(row.Estado),
        estadoCobro:   'PENDIENTE',
        facturaNumero: row.FacturaNumero || null,
        observaciones: row.Observaciones || null,
        incluyeIva,
        formaPago:     row.Forma_PAGO || 'Contado',
        validezDias:   parseInt(row.VALIDEZ_OFERTA) || 7,
        moneda:        'ARS',
        clienteId,
        ordenId,
        usuarioId:     adminUser.id,
      }
    })
    .filter(Boolean)

  await prisma.presupuesto.createMany({
    data: presupuestosData.map(({ _key, ...d }) => d),
  })

  // Construir mapa NUM_Presupuesto → db id
  const pptosDb = await prisma.presupuesto.findMany({ select: { id: true, numero: true } })
  // OJO: pueden haber colisiones de numero si el sheet tiene basura, usamos un Map para el último
  const pptoIdByNumero = Object.fromEntries(pptosDb.map(p => [p.numero, p.id]))
  const presupuestoMap = Object.fromEntries(
    presupuestosData.map(p => [p._key, pptoIdByNumero[p.numero]])
  )

  const skipped = presupuestosRows.length - presupuestosData.length
  console.log(`   ✓ ${presupuestosData.length} presupuestos (${skipped} omitidos)\n`)

  // ── 7. Items de presupuesto (batch) ──────────────────────────────────────
  console.log('📝 Importando items...')
  const itemsData = descripcionRows
    .filter(r => r.NUM_Presupuesto && presupuestoMap[r.NUM_Presupuesto])
    .map(r => ({
      cantidad:      parseInt(r.Cantidad) || 1,
      descripcion:   r.Descripcion || 'Sin descripción',
      precio:        parseFloat(r.Precio) || 0,
      total:         parseFloat(r.Total)  || 0,
      presupuestoId: presupuestoMap[r.NUM_Presupuesto],
    }))

  await prisma.itemPresupuesto.createMany({ data: itemsData })
  console.log(`   ✓ ${itemsData.length} items\n`)

  // ── 8. Cobranzas (batch) ─────────────────────────────────────────────────
  console.log('💵 Importando cobranzas...')
  const cobranzasData = cobranzasRows
    .map(row => {
      const cajaId = getCajaId(row.UsuarioCaja)
      if (!cajaId) return null
      return {
        tipo:          (row.Tipo || '').toLowerCase().includes('varia') ? 'COBRANZA_VARIA' : 'PRESUPUESTO',
        fecha:         parseDate(row.Fecha) || new Date(),
        descripcion:   row.Descripcion || null,
        importe:       parseFloat(row.Importe) || 0,
        formaPago:     resolveFormaPago(row.FormaDePago),
        clienteId:     clienteMap[row.Cliente] || null,
        presupuestoId: presupuestoMap[row.PresupuestoCobrado] || null,
        cajaId,
        usuarioId:     adminUser.id,
        chequeId:      row.IDCheque ? (chequeMap[row.IDCheque] ?? null) : null,
      }
    })
    .filter(Boolean)

  await prisma.cobranza.createMany({ data: cobranzasData })
  console.log(`   ✓ ${cobranzasData.length} cobranzas\n`)

  // ── 9. Actualizar estadoCobro ─────────────────────────────────────────────
  console.log('📊 Calculando estado de cobro...')
  // Aggregate cobranzas por presupuesto en una sola query
  const cobranzasPorPpto = await prisma.cobranza.groupBy({
    by: ['presupuestoId'],
    _sum: { importe: true },
    where: { presupuestoId: { not: null } },
  })
  const cobradoByPptoId = Object.fromEntries(
    cobranzasPorPpto.map(r => [r.presupuestoId, r._sum.importe ?? 0])
  )

  const pptosConItems = await prisma.presupuesto.findMany({
    select: { id: true, incluyeIva: true, items: { select: { total: true } } },
  })

  let cobrados = 0, parciales = 0
  for (const p of pptosConItems) {
    const subtotal = p.items.reduce((s, i) => s + i.total, 0)
    const total    = p.incluyeIva ? subtotal * 1.21 : subtotal
    const cobrado  = cobradoByPptoId[p.id] ?? 0

    let estadoCobro = 'PENDIENTE'
    if (total > 0 && cobrado >= total * 0.99) estadoCobro = 'COBRADO'
    else if (cobrado > 0)                      estadoCobro = 'PARCIAL'

    if (estadoCobro !== 'PENDIENTE') {
      await prisma.presupuesto.update({ where: { id: p.id }, data: { estadoCobro } })
      if (estadoCobro === 'COBRADO') cobrados++; else parciales++
    }
  }
  console.log(`   ✓ ${cobrados} COBRADOS, ${parciales} PARCIALES\n`)

  // ── 10. Gastos (batch) ───────────────────────────────────────────────────
  console.log('💸 Importando gastos...')
  const gastosData = gastosRows
    .map(row => {
      const cajaId = getCajaId(row.UsuarioCaja)
      if (!cajaId) return null
      return {
        tipo:        (row.Tipo || '').toLowerCase() === 'sueldo' ? 'SUELDO' : 'GASTO_VARIOS',
        fecha:       parseDate(row.Fecha) || new Date(),
        descripcion: row.Descripcion || row.NumRecibo || 'Sin descripción',
        importe:     parseFloat(row.Importe) || 0,
        formaPago:   resolveFormaPago(row.FormaDePago),
        comprobante: row.Comprobante || null,
        empleado:    row.Empleado   || null,
        desde:       parseDate(row.Desde),
        hasta:       parseDate(row.Hasta),
        cajaId,
        usuarioId:   adminUser.id,
        chequeId:    row.IDCheque ? (chequeMap[row.IDCheque] ?? null) : null,
      }
    })
    .filter(Boolean)

  await prisma.gasto.createMany({ data: gastosData })
  console.log(`   ✓ ${gastosData.length} gastos\n`)

  // ── 11. Movimientos de Caja (batch) ──────────────────────────────────────
  console.log('🏦 Importando movimientos de caja...')
  const movimientosData = cajaRows
    .filter(row => resolveCajaNombre(row.UsuarioCaja) !== 'Cheques')
    .map(row => {
      const cajaId = getCajaId(row.UsuarioCaja)
      if (!cajaId) return null
      return {
        fecha:       parseDate(row.Fecha) || new Date(),
        descripcion: row.Descripcion || '-',
        ingreso:     parseFloat(row.Ingreso) || 0,
        egreso:      parseFloat(row['Egreso']) || 0,
        formaPago:   resolveFormaPago(row.FormaDePago),
        cajaId,
      }
    })
    .filter(Boolean)

  // Cheques EN_CARTERA → movimientos de inventario en caja Cheques
  const cajaCheques = cajaIdByNombre['cheques']
  if (cajaCheques) {
    const enCartera = await prisma.cheque.findMany({ where: { estado: 'EN_CARTERA' } })
    for (const ch of enCartera) {
      movimientosData.push({
        fecha:       ch.fechaIngreso,
        descripcion: `Cheque: ${ch.librador || ''}${ch.numeroCheque ? ' - N°' + ch.numeroCheque : ''}`.trim(),
        ingreso:     ch.importe,
        egreso:      0,
        formaPago:   'Cheques',
        cajaId:      cajaCheques,
      })
    }
  }

  await prisma.movimientoCaja.createMany({ data: movimientosData })
  console.log(`   ✓ ${movimientosData.length} movimientos\n`)

  // ── 12. Transferencias (batch) ────────────────────────────────────────────
  console.log('↔️  Importando transferencias...')
  const transferenciasData = transferenciasRows
    .map(row => {
      const cajaOrigenId  = getCajaId(row.UsuarioCajaOrigen)
      const cajaDestinoId = getCajaId(row.UsuarioCajaDestino)
      if (!cajaOrigenId || !cajaDestinoId) return null
      return {
        fecha:            parseDate(row.Fecha) || new Date(),
        monto:            parseFloat(row.Monto) || 0,
        descripcion:      row.Descripcion || null,
        formaPagoOrigen:  resolveFormaPago(row.FormaDePagoOrigen),
        formaPagoDestino: resolveFormaPago(row.FormaDePagoDestino),
        cajaOrigenId,
        cajaDestinoId,
      }
    })
    .filter(Boolean)

  await prisma.transferenciaCaja.createMany({ data: transferenciasData })
  console.log(`   ✓ ${transferenciasData.length} transferencias\n`)

  // ── 13. Resetear secuencias autoincrement ─────────────────────────────────
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"Presupuesto"', 'numero'),
      COALESCE((SELECT MAX(numero) FROM "Presupuesto"), 0) + 1
    )
  `)
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"OrdenTrabajo"', 'numero'),
      COALESCE((SELECT MAX(numero) FROM "OrdenTrabajo"), 0) + 1
    )
  `)

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log('╔══════════════════════════════════════════════╗')
  console.log(`║  ✅ Sincronización completa en ${elapsed}s`.padEnd(47) + '║')
  console.log('╚══════════════════════════════════════════════╝\n')

  await prisma.$disconnect()
}

main().catch(async err => {
  console.error('\n❌ Error durante la sincronización:')
  console.error(err.message || err)
  await prisma.$disconnect()
  process.exit(1)
})
