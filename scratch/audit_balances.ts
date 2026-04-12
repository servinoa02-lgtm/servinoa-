
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const boxesToAudit = ['JULIO', 'SERVINOA', 'MERCADO PAGO'];
  
  console.log('--- AUDIT REPORT ---');
  
  for (const boxName of boxesToAudit) {
    const box = await prisma.caja.findFirst({
      where: { nombre: boxName }
    });
    
    if (!box) {
      console.log(`Box ${boxName} not found.`);
      continue;
    }
    
    console.log(`\n--- ${boxName} (${box.id}) ---`);
    
    // Total balance calculated by us
    const agg = await prisma.movimientoCaja.aggregate({
      where: { cajaId: box.id },
      _sum: { ingreso: true, egreso: true }
    });
    const balance = (agg._sum.ingreso || 0) - (agg._sum.egreso || 0);
    console.log(`Calculated Total Balance: ${balance.toLocaleString('es-AR')}`);
    
    // Balance at cut-off (10/04/2026 23:59:59)
    const aggCutoff = await prisma.movimientoCaja.aggregate({
      where: { 
        cajaId: box.id,
        fecha: { lte: new Date('2026-04-10T23:59:59Z') }
      },
      _sum: { ingreso: true, egreso: true }
    });
    const balanceCutoff = (aggCutoff._sum.ingreso || 0) - (aggCutoff._sum.egreso || 0);
    console.log(`Balance at 10/04: ${balanceCutoff.toLocaleString('es-AR')}`);
    
    // Movements on or after 10/04
    console.log('Movements on or after 10/04:');
    const movs = await prisma.movimientoCaja.findMany({
      where: { 
        cajaId: box.id,
        fecha: { gte: new Date('2026-04-10T00:00:00Z') }
      },
      orderBy: { fecha: 'asc' }
    });
    
    if (movs.length === 0) {
      console.log('  None found.');
    } else {
      movs.forEach(m => {
        console.log(`  [${m.fecha.toISOString()}] ${m.descripcion}: +${m.ingreso} -${m.egreso}`);
      });
    }

    // Special search for the 425k discrepancy (often salary as noted in summary)
    // 250k and 175k
    console.log('Checking for salary payments (250k/175k):');
    const salaries = await prisma.movimientoCaja.findMany({
      where: {
        cajaId: box.id,
        OR: [
          { egreso: 250000 },
          { egreso: 175000 },
          { egreso: 425000 }
        ]
      }
    });
    salaries.forEach(s => {
      console.log(`  FOUND [${s.fecha.toISOString()}] ${s.descripcion}: -${s.egreso}`);
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
