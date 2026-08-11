import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootApp, truncar, semearUsuario } from './helpers';

// e2e REAL: fala com o Postgres do container, não com mock.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
  });

  beforeEach(async () => {
    await truncar(prisma);
    await semearUsuario(prisma, 'cliente@inv.com', 'senhaForte1', 'CLIENTE');
  });

  afterAll(async () => {
    await app.close();
  });

  it('login com credencial válida → 200 + JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'cliente@inv.com', senha: 'senhaForte1' })
      .expect(200);

    expect(typeof (res.body as { accessToken: string }).accessToken).toBe(
      'string',
    );
  });

  it('senha errada → 401', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'cliente@inv.com', senha: 'errada' })
      .expect(401);
  });

  it('email inexistente → 401 (não vaza que o email não existe)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ninguem@inv.com', senha: 'senhaForte1' })
      .expect(401);
  });
});
