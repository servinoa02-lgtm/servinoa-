require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.ordenTrabajo.findMany({ select: { id: true, numero: true } }).then(o => {
  console.log("OTs:", o);
  p.$disconnect();
});