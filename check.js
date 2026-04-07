require("dotenv").config();
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "OK" : "NO ENCONTRADA");
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.usuario.findMany().then(u => { console.log(u); p.$disconnect(); });