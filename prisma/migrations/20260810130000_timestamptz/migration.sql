-- Corrige colunas de tempo para timestamptz (timestamp WITH time zone).
-- timestamp sem tz armazena relogio-de-parede sem offset: ambiguo entre
-- servidores/clientes/DST. timestamptz guarda instante absoluto (UTC).
-- USING preserva os valores existentes interpretando-os como UTC.

ALTER TABLE "User"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Chamado"
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
