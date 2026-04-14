// Script de una sola vez: carga los teléfonos de los empleados
// Ejecutar con: node prisma/seed-phones.js
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

const EMPLEADOS = [
  { nombre: "Maximiliano Alarcon", telefono: "3875059482" },
  { nombre: "Mirko Aybar",         telefono: "3875840154" },
  { nombre: "Agostina Molina",     telefono: "3875941089" },
  { nombre: "Julio Bautista",      telefono: "3874569398" },
  { nombre: "Pablo Galloni",       telefono: "3874894011" },
  { nombre: "Nicolas Hissa",       telefono: "3876199932" },
];

async function main() {
  console.log("Cargando teléfonos...\n");

  for (const e of EMPLEADOS) {
    // Buscar por primera palabra del nombre (más tolerante a variaciones)
    const primerNombre = e.nombre.split(" ")[0];
    const apellido = e.nombre.split(" ").slice(1).join(" ");

    const resultado = await prisma.usuario.updateMany({
      where: {
        nombre: {
          contains: primerNombre,
          mode: "insensitive",
        },
      },
      data: { telefono: e.telefono },
    });

    if (resultado.count > 0) {
      console.log(`✓ ${e.nombre} → ${e.telefono}`);
    } else {
      console.log(`✗ No encontrado: ${e.nombre} (buscado por "${primerNombre}")`);
    }
  }

  console.log("\nListo. Teléfonos actualizados en la base de datos.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
