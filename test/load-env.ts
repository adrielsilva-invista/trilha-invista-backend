// Carrega .env.test no processo worker do jest (onde o app boota e lê
// DATABASE_URL/JWT_SECRET). globalSetup roda em processo separado, por isso
// o env precisa ser carregado aqui também.
import { config } from 'dotenv';
config({ path: '.env.test' });
