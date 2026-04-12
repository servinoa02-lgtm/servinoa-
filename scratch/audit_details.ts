
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const boxes = await prisma.caja.findMany({
    where: { nombre: { in: ['JULIO', 'SERVINOA', 'MERCADO PAGO'] } },
    include: {
      movimientos: {
        where: { fecha: { gte: new Date('2026-04-01T00:00:00Z') } },
        orderBy: { fecha: 'asc' }
      }
    }
  });
  
  console.log('--- DETAILED MOVEMENT AUDIT (APRIL) ---');
  for (const box of boxes) {
    console.log(`\n--- BOX: ${box.nombre} ---`);
    for (const m of box.movimientos) {
      console.log(`[${m.fecha.toISOString().split('T')[0]}] ${m.descripcion}: +${m.ingreso} -${m.egreso}`);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
