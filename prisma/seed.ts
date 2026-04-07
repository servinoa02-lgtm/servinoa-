const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  const user = await prisma.usuario.upsert({
    where: { email: "admin@servinoa.com" },
    update: {},
    create: {
      nombre: "Admin",
      email: "admin@servinoa.com",
      password: hash,
      rol: "ADMIN",
    },
  });
  console.log("Usuario creado:", user.email);

  // Seed de cajas
  const cajas = ["Pablo", "Julio", "Nico", "Servinoa", "Cheques", "Retenciones", "Macro", "Mercado Pago"];
  for (const nombre of cajas) {
    await prisma.caja.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log("Cajas creadas:", cajas.join(", "));
}

main().then(() => prisma.$disconnect());
