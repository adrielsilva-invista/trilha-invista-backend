-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('PROBLEMA_TECNICO', 'DUVIDA', 'RECLAMACAO', 'SOLICITACAO', 'OUTROS');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "Area" AS ENUM ('ENGENHARIA', 'QUALIDADE', 'LOGISTICA', 'COMERCIAL', 'SUPORTE_TECNICO', 'OUTROS');

-- CreateEnum
CREATE TYPE "Sentimento" AS ENUM ('POSITIVO', 'NEUTRO', 'NEGATIVO', 'FRUSTRADO');

-- CreateEnum
CREATE TYPE "TicketEventType" AS ENUM ('CLASSIFICACAO_IA', 'FALHA_CLASSIFICACAO', 'RECLASSIFICACAO', 'ATRIBUICAO', 'MUDANCA_STATUS');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "classificacao_manual_pendente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "final_area" "Area",
ADD COLUMN     "final_categoria" "Categoria",
ADD COLUMN     "final_prioridade" "Prioridade",
ADD COLUMN     "final_sentimento" "Sentimento",
ADD COLUMN     "ia_modelo" TEXT,
ADD COLUMN     "ia_versao" TEXT,
ADD COLUMN     "original_area" "Area",
ADD COLUMN     "original_categoria" "Categoria",
ADD COLUMN     "original_prioridade" "Prioridade",
ADD COLUMN     "original_sentimento" "Sentimento",
ADD COLUMN     "resumo" VARCHAR(300);

-- CreateTable
CREATE TABLE "ticket_events" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "type" "TicketEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "author_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_events_ticket_id_created_at_idx" ON "ticket_events"("ticket_id", "created_at");

-- AddForeignKey
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
