
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const boxNames = ['JULIO', 'SERVINOA', 'MERCADO PAGO', 'PABLO', 'NICO'];
  const cutoffDate = new Date('2026-04-10T23:59:59Z');
  
  console.log(`--- RECONCILIATION AUDIT (Cut-off: ${cutoffDate.toISOString()}) ---`);
  
  for (const name of boxNames) {
    const box = await prisma.caja.findFirst({
      where: { nombre: { contains: name, mode: 'insensitive' } }
    });
    
    if (!box) {
      console.log(`Box "${name}" not found.`);
      continue;
    }
    
    // Total currently
    const aggNow = await prisma.movimientoCaja.aggregate({
      where: { cajaId: box.id },
      _sum: { ingreso: true, egreso: true }
    });
    const balanceNow = (aggNow._sum.ingreso || 0) - (aggNow._sum.egreso || 0);
    
    // Total at cutoff
    const aggCut = await prisma.movimientoCaja.aggregate({
      where: { 
        cajaId: box.id,
        fecha: { lte: cutoffDate }
      },
      _sum: { ingreso: true, egreso: true }
    });
    const balanceCut = (aggCut._sum.ingreso || 0) - (aggCut._sum.egreso || 0);
    
    console.log(`\n--- ${box.nombre} ---`);
    console.log(`Current Balance: ${balanceNow.toLocaleString('es-AR')}`);
    console.log(`Balance at 10/04: ${balanceCut.toLocaleString('es-AR')}`);
    
    const diff = balanceNow - balanceCut;
    if (diff !== 0) {
      console.log(`Difference (Post-cutoff): ${diff.toLocaleString('es-AR')}`);
      const movs = await prisma.movimientoCaja.findMany({
        where: { cajaId: box.id, fecha: { gt: cutoffDate } }
      });
      movs.forEach(m => console.log(`  > [${m.fecha.toISOString()}] ${m.descripcion}: +${m.ingreso} -${m.egreso} `));
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
