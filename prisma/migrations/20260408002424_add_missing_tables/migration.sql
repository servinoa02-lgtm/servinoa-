/*
  Warnings:

  - You are about to drop the `ResumenCuenta` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoMovimientoCuenta" AS ENUM ('DEBE', 'HABER');

-- CreateEnum
CREATE TYPE "OrigenMovimientoCuenta" AS ENUM ('PRESUPUESTO', 'COBRANZA', 'MANUAL');

-- DropForeignKey
ALTER TABLE "ResumenCuenta" DROP CONSTRAINT "ResumenCuenta_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "ResumenCuenta" DROP CONSTRAINT "ResumenCuenta_cobranzaId_fkey";

-- DropForeignKey
ALTER TABLE "ResumenCuenta" DROP CONSTRAINT "ResumenCuenta_presupuestoId_fkey";

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "cuit" TEXT;

-- AlterTable
ALTER TABLE "Nota" ADD COLUMN     "esSeguimiento" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrdenTrabajo" ADD COLUMN     "fechaEstimadaEntrega" TIMESTAMP(3),
ADD COLUMN     "revisionTecnica" TEXT;

-- DropTable
DROP TABLE "ResumenCuenta";

-- CreateTable
CREATE TABLE "CuentaCorriente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoMovimientoCuenta" NOT NULL,
    "origen" "OrigenMovimientoCuenta" NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presupuestoId" TEXT,
    "cobranzaId" TEXT,

    CONSTRAINT "CuentaCorriente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColaMensajes" (
    "id" TEXT NOT NULL,
    "tipoNotificacion" TEXT NOT NULL,
    "destinatario" TEXT,
    "datos" TEXT NOT NULL,
    "procesarDespuesDe" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "reintentos" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColaMensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccesorioCatalogo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "AccesorioCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccesorioCatalogo_nombre_key" ON "AccesorioCatalogo"("nombre");

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_cobranzaId_fkey" FOREIGN KEY ("cobranzaId") REFERENCES "Cobranza"("id") ON DELETE SET NULL ON UPDATE CASCADE;
