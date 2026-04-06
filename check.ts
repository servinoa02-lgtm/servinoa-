import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany();
  console.log("Usuarios encontrados:", users.length);

  if (users.length === 0) {
    const password = await bcrypt.hash("admin123", 10);
    const admin = await prisma.usuario.create({
      data: {
        nombre: "Nicolas",
        email: "admin@servinoa.com",
        password: password,
        rol: "ADMIN",
      },
    });
    console.log("Usuario CREADO:", admin.email);
  } else {
    users.forEach((u) => console.log(u.email, u.rol));
  }
}

main()
  .catch((e) => console.error("ERROR:", e))
  .finally(() => prisma.$disconnect());