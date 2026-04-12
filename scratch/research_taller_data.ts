
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESEARCHING WORKSHOP DATA ---');

  const hoy = new Date();
  const doceMesesAtras = new Date();
  doceMesesAtras.setMonth(hoy.getMonth() - 12);

  // 1. OTs per Month
  const ots = await prisma.ordenTrabajo.findMany({
    where: { fechaRecepcion: { gte: doceMesesAtras } },
    select: { fechaRecepcion: true }
  });

  const monthsMap = new Map<string, number>();
  ots.forEach(ot => {
    const k = `${ot.fechaRecepcion.getFullYear()}-${ot.fechaRecepcion.getMonth()}`;
    monthsMap.set(k, (monthsMap.get(k) || 0) + 1);
  });

  console.log('OT Volume per month:', Object.fromEntries(monthsMap));

  // 2. Top Clientes (by OT count)
  const topClientes = await prisma.ordenTrabajo.groupBy({
    by: ['clienteId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  });

  const clienteIds = topClientes.map(c => c.clienteId);
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, nombre: true }
  });

  const topClientesConNombre = topClientes.map(c => ({
    nombre: clientes.find(cl => cl.id === c.clienteId)?.nombre || 'Desconocido',
    cantidad: c._count.id
  })).sort((a,b) => b.cantidad - a.cantidad);

  console.log('Top Clientes:', topClientesConNombre);

  // 3. Status Distribution
  const statusDist = await prisma.ordenTrabajo.groupBy({
    by: ['estado'],
    _count: { id: true }
  });

  console.log('Status Distribution:', statusDist);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
