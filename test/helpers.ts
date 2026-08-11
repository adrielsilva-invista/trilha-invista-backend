import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import type { Perfil } from '../src/auth/domain/perfil';

// App no generic: getHttpServer() retorna App em vez de any → mata os
// warnings no-unsafe-argument do supertest sem espalhar cast pelos specs.
export interface E2eContext {
  app: INestApplication<App>;
  prisma: PrismaService;
}

// Boota o app REAL. Replica o ValidationPipe do main.ts (ele vive no bootstrap,
// não no AppModule — sem isso os 400 de DTO não disparam no e2e).
export async function bootApp(): Promise<E2eContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

// Zera as tabelas entre testes. RESTART IDENTITY torna os ids previsíveis;
// CASCADE respeita a FK author (tickets → users). Hard delete: o schema tem
// email @unique GLOBAL (D-07), então soft delete deixaria lixo que colide no reseed.
export async function truncar(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE tickets, users RESTART IDENTITY CASCADE',
  );
}

// Semeia um usuário direto no banco (hash bcrypt real) e devolve o id.
export async function semearUsuario(
  prisma: PrismaService,
  email: string,
  senha: string,
  perfil: Perfil,
): Promise<number> {
  const user = await prisma.user.create({
    data: { email, passwordHash: await hash(senha, 10), perfil },
  });
  return user.id;
}

// Loga via HTTP (fluxo real) e devolve o Bearer token pronto pro header.
export async function loginToken(
  app: INestApplication<App>,
  email: string,
  senha: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, senha })
    .expect(200);
  return `Bearer ${(res.body as { accessToken: string }).accessToken}`;
}
