
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const boxNames = ['JULIO', 'SERVINOA', 'MERCADO PAGO'];
  
  console.log('--- INITIAL AUDIT ---');
  
  for (const name of boxNames) {
    const box = await prisma.caja.findFirst({
      where: { nombre: { contains: name, mode: 'insensitive' } }
    });
    
    if (!box) continue;
    
    console.log(`\n--- ${box.nombre} ---`);
    const firstMov = await prisma.movimientoCaja.findFirst({
      where: { cajaId: box.id },
      orderBy: { fecha: 'asc' }
    });
    
    if (firstMov) {
      console.log(`First Movement: [${firstMov.fecha.toISOString()}] ${firstMov.descripcion}: +${firstMov.ingreso} -${firstMov.egreso}`);
    }
    
    const allMovs = await prisma.movimientoCaja.findMany({
      where: { cajaId: box.id },
      orderBy: { fecha: 'asc' }
    });
    
    console.log(`Total Movements Count: ${allMovs.length}`);
    
    // Look for transfers on 10/4
    const transfers = allMovs.filter(m => m.fecha.toISOString().startsWith('2026-04-10'));
    if (transfers.length > 0) {
      console.log('Movements on 10/04:');
      transfers.forEach(t => console.log(`  [${t.fecha.toISOString()}] ${t.descripcion}: +${t.ingreso} -${t.egreso}`));
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
