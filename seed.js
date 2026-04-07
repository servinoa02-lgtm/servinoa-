const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();

async function run() {
  const h = await bcrypt.hash("admin123", 10);
  const u = await p.usuario.upsert({
    where: { email: "admin@servinoa.com" },
    update: {},
    create: {
      nombre: "Admin",
      email: "admin@servinoa.com",
      password: h,
      rol: "ADMIN",
    },
  });
  console.log("CREADO:", u.email);
  await p.$disconnect();
}