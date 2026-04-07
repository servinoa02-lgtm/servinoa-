import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.accesorioCatalogo.deleteMany();
  console.log("Accesorios eliminados correctamente.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
