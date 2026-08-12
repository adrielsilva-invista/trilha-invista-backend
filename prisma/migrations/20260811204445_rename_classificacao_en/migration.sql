-- Rename dos identificadores físicos pt-BR → inglês (padrão do schema, linha 2).
-- RENAME preserva os dados (as colunas nascem nullable e vazias, mas RENAME é o
-- correto de qualquer forma) — ao contrário do DROP+ADD que o Prisma gera por default.
-- Os VALORES dos enums (PROBLEMA_TECNICO, BAIXA, …) NÃO mudam: são contrato com a IA.

-- Rename dos tipos enum
ALTER TYPE "Categoria" RENAME TO "Category";
ALTER TYPE "Prioridade" RENAME TO "Priority";
ALTER TYPE "Sentimento" RENAME TO "Sentiment";

-- Rename das colunas de tickets
ALTER TABLE "tickets" RENAME COLUMN "classificacao_manual_pendente" TO "needs_manual_classification";
ALTER TABLE "tickets" RENAME COLUMN "original_categoria"  TO "original_category";
ALTER TABLE "tickets" RENAME COLUMN "original_prioridade" TO "original_priority";
ALTER TABLE "tickets" RENAME COLUMN "original_sentimento" TO "original_sentiment";
ALTER TABLE "tickets" RENAME COLUMN "final_categoria"     TO "final_category";
ALTER TABLE "tickets" RENAME COLUMN "final_prioridade"    TO "final_priority";
ALTER TABLE "tickets" RENAME COLUMN "final_sentimento"    TO "final_sentiment";
ALTER TABLE "tickets" RENAME COLUMN "resumo"    TO "summary";
ALTER TABLE "tickets" RENAME COLUMN "ia_modelo" TO "ai_model";
ALTER TABLE "tickets" RENAME COLUMN "ia_versao" TO "ai_version";

-- original_area / final_area não mudam ("area" já é inglês).
