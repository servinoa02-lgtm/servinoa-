const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGaps() {
  const years = [2024, 2025];
  for (const y of years) {
    const start = new Date(`${y}-12-25T00:00:00Z`);
    const end = new Date(`${y+1}-01-04T23:59:59Z`);
    const count = await prisma.movimientoCaja.count({
      where: { fecha: { gte: start, lte: end } }
    });
    console.log(`Movements between Dec 25, ${y} and Jan 4, ${y+1}: ${count}`);
    if (count > 0) {
      const samples = await prisma.movimientoCaja.findMany({
        where: { fecha: { gte: start, lte: end } },
        take: 3
      });
      console.log('Sample dates:', samples.map(s => s.fecha));
    }
  }
}

checkGaps().finally(() => prisma.$disconnect());
