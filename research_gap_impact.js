const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGapImpact() {
  const movs = await prisma.movimientoCaja.aggregate({
    where: {
      OR: [
        { fecha: { gte: new Date('2024-12-25'), lte: new Date('2025-01-04') } },
        { fecha: { gte: new Date('2025-12-25'), lte: new Date('2026-01-04') } }
      ]
    },
    _sum: { ingreso: true, egreso: true }
  });
  console.log('Impact of gap movements:', movs);
}

checkGapImpact().finally(() => prisma.$disconnect());
