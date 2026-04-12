
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING RECONCILIATION EXECUTION ---');

  // 1. Get IDs for the boxes
  const cajas = await prisma.caja.findMany({
    where: {
      nombre: {
        in: ['JULIO', 'Servinoa', 'Mercado Pago'],
        mode: 'insensitive'
      }
    }
  });

  const getCajaId = (name: string) => cajas.find(c => c.nombre.toLowerCase().includes(name.toLowerCase()))?.id;

  const idJulio = getCajaId('julio');
  const idServinoa = getCajaId('servinoa');
  const idMP = getCajaId('mercado pago');

  if (!idJulio || !idServinoa || !idMP) {
    throw new Error(`One or more boxes not found. IDs: Julio=${idJulio}, Servinoa=${idServinoa}, MP=${idMP}`);
  }

  const dateCutoff = new Date('2026-04-10T12:00:00Z'); // Mid-day for 10/04

  console.log('Inserting missing movements...');

  const results = await prisma.$transaction([
    // JULIO: Missing Income
    prisma.movimientoCaja.create({
      data: {
        fecha: dateCutoff,
        descripcion: 'PARTICULAR - Barrios Ariel - Ppto Nº2026-01297 (Reconciliación)',
        ingreso: 140000,
        egreso: 0,
        formaPago: 'Efectivo',
        cajaId: idJulio
      }
    }),

    // SERVINOA: Missing Expenses
    prisma.movimientoCaja.create({
      data: {
        fecha: dateCutoff,
        descripcion: 'Sueldo Maxi Del 04/06/2026 al 04/10/2026 (Reconciliación)',
        ingreso: 0,
        egreso: 72000,
        formaPago: 'Efectivo',
        cajaId: idServinoa
      }
    }),
    prisma.movimientoCaja.create({
      data: {
        fecha: dateCutoff,
        descripcion: 'Sueldo Mirko Del 04/06/2026 al 04/10/2026 (Reconciliación)',
        ingreso: 0,
        egreso: 150000,
        formaPago: 'Efectivo',
        cajaId: idServinoa
      }
    }),
    // Adjustment to match 366.509,38
    prisma.movimientoCaja.create({
      data: {
        fecha: dateCutoff,
        descripcion: 'Ajuste conciliación saldo 10/04 (Reconciliación)',
        ingreso: 0,
        egreso: 9100,
        formaPago: 'Efectivo',
        cajaId: idServinoa
      }
    }),

    // MERCADO PAGO: Missing Expenses
    prisma.movimientoCaja.create({
      data: {
        fecha: dateCutoff,
        descripcion: 'Sueldo Nico Del 04/06/2026 al 04/10/2026 (Reconciliación)',
        ingreso: 0,
        egreso: 250000,
        formaPago: 'Efectivo',
        cajaId: idMP
      }
    }),
    prisma.movimientoCaja.create({
      data: {
        fecha: dateCutoff,
        descripcion: 'Sueldo Agostina Del 04/06/2026 al 04/10/2026 (Reconciliación)',
        ingreso: 0,
        egreso: 175000,
        formaPago: 'Efectivo',
        cajaId: idMP
      }
    })
  ]);

  console.log(`Successfully inserted ${results.length} movements.`);
  
  // Verify final balances
  const finalBoxes = await prisma.caja.findMany({
    where: { id: { in: [idJulio, idServinoa, idMP] } },
    include: { movimientos: { select: { ingreso: true, egreso: true } } }
  });

  console.log('\n--- FINAL BALANCES CHECK ---');
  finalBoxes.forEach(b => {
    const balance = b.movimientos.reduce((acc, m) => acc + (m.ingreso || 0) - (m.egreso || 0), 0);
    console.log(`${b.nombre}: $${balance.toLocaleString('es-AR')}`);
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
