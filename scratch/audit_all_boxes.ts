
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- ALL CAJAS AUDIT ---');
  
  const boxes = await prisma.caja.findMany({
    include: {
      movimientos: {
        select: { ingreso: true, egreso: true }
      }
    }
  });
  
  for (const box of boxes) {
    const balance = box.movimientos.reduce((acc, m) => acc + (m.ingreso || 0) - (m.egreso || 0), 0);
    console.log(`- "${box.nombre}": $${balance.toLocaleString('es-AR')}`);
  }
  
  console.log('\n--- SEARCHING FOR $250.000, $175.000 or $425.000 EXPENSES (EGRESO) ---');
  const expenses = await prisma.movimientoCaja.findMany({
    where: {
      OR: [
        { egreso: 250000 },
        { egreso: 175000 },
        { egreso: 425000 }
      ]
    },
    include: { caja: true }
  });
  
  if (expenses.length === 0) {
    console.log('No such expenses found in MovimientoCaja.');
  } else {
    expenses.forEach(e => {
      console.log(`[${e.fecha.toISOString()}] ${e.descripcion} en ${e.caja?.nombre}: -${e.egreso}`);
    });
  }

  console.log('\n--- MOVEMENTS ON OR AFTER 10/04/2026 ---');
  const recent = await prisma.movimientoCaja.findMany({
    where: { fecha: { gte: new Date('2026-04-10T00:00:00Z') } },
    include: { caja: true },
    orderBy: { fecha: 'asc' }
  });
  
  recent.forEach(r => {
    console.log(`[${r.fecha.toISOString()}] ${r.descripcion} en ${r.caja?.nombre}: +${r.ingreso} -${r.egreso}`);
  });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
