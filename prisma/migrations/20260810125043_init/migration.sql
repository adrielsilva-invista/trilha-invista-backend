-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('CLIENTE', 'FUNCIONARIO', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusChamado" AS ENUM ('AGUARDANDO_CLASSIFICACAO', 'ABERTO', 'EM_ATENDIMENTO', 'RESOLVIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chamado" (
    "id" SERIAL NOT NULL,
    "texto" TEXT NOT NULL,
    "status" "StatusChamado" NOT NULL DEFAULT 'AGUARDANDO_CLASSIFICACAO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "funcionarioId" INTEGER,

    CONSTRAINT "Chamado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Chamado_clienteId_idx" ON "Chamado"("clienteId");

-- CreateIndex
CREATE INDEX "Chamado_funcionarioId_idx" ON "Chamado"("funcionarioId");

-- CreateIndex
CREATE INDEX "Chamado_status_idx" ON "Chamado"("status");

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
