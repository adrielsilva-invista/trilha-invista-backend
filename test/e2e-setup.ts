import { execSync } from 'node:child_process';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// globalSetup do jest-e2e: roda UMA vez antes de toda a suíte.
// 1) carrega .env.test  2) cria o banco _test se não existir  3) migrate deploy.
// Idempotente: seguro rodar em máquina limpa ou já provisionada.
export default async function setup(): Promise<void> {
  config({ path: '.env.test' });

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL ausente — confira o .env.test');

  const dbName = new URL(url).pathname.replace(/^\//, '');
  // URL "admin": mesmo servidor, banco de manutenção `postgres`, pra poder criar o _test.
  const adminUrl = url.replace(`/${dbName}`, '/postgres');

  const admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    // CREATE DATABASE não roda em transação; $executeRawUnsafe executa direto.
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch (e) {
    // 42P04 = duplicate_database: já existe, segue o baile.
    if (!/already exists|42P04/i.test(String(e))) throw e;
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
