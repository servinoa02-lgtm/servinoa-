-- CreateEnum
CREATE TYPE "EstadoOS" AS ENUM ('PENDIENTE', 'PROGRAMADO', 'EN_CURSO', 'REALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "OrdenServicio" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaProgramada" TIMESTAMP(3),
    "estado" "EstadoOS" NOT NULL DEFAULT 'PENDIENTE',
    "descripcion" TEXT,
    "ubicacion" TEXT,
    "observaciones" TEXT,
    "horasCampo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kilometros" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imprevistos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorHora" DOUBLE PRECISION NOT NULL DEFAULT 55,
    "valorKm" DOUBLE PRECISION NOT NULL DEFAULT 1.7,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0.21,
    "tipoCambio" DOUBLE PRECISION NOT NULL DEFAULT 1420,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tecnicoId" TEXT,
    "creadorId" TEXT NOT NULL,

    CONSTRAINT "OrdenServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialOS" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estadoAnterior" "EstadoOS",
    "estadoNuevo" "EstadoOS" NOT NULL,
    "comentario" TEXT,
    "ordenId" TEXT NOT NULL,

    CONSTRAINT "HistorialOS_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Presupuesto" ADD COLUMN "ordenServicioId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrdenServicio_numero_key" ON "OrdenServicio"("numero");

-- AddForeignKey
ALTER TABLE "OrdenServicio" ADD CONSTRAINT "OrdenServicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenServicio" ADD CONSTRAINT "OrdenServicio_tecnicoId_fkey" FOREIGN KEY ("tecnicoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenServicio" ADD CONSTRAINT "OrdenServicio_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialOS" ADD CONSTRAINT "HistorialOS_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "OrdenServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_ordenServicioId_fkey" FOREIGN KEY ("ordenServicioId") REFERENCES "OrdenServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
