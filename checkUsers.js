const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true
      }
    });

    console.log('--- Listado de Usuarios ---');
    users.forEach(u => {
      console.log(`ID: ${u.id} | Nombre: ${u.nombre} | Email: ${u.email} | Rol: ${u.rol} | Activo: ${u.activo}`);
    });
  } catch (error) {
    console.error('Error al consultar usuarios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
