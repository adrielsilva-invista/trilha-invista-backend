import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootApp, truncar, semearUsuario, loginToken } from './helpers';

// e2e REAL: 409 vem da constraint UNIQUE do Postgres, não de mock.
describe('POST /usuarios (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenAdmin: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
  });

  beforeEach(async () => {
    await truncar(prisma);
    await semearUsuario(prisma, 'admin@inv.com', 'senhaForte1', 'ADMIN');
    await semearUsuario(prisma, 'cliente@inv.com', 'senhaForte1', 'CLIENTE');
    tokenAdmin = await loginToken(app, 'admin@inv.com', 'senhaForte1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('ADMIN cria usuário → 201 e resposta nunca expõe passwordHash', async () => {
    const res = await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', tokenAdmin)
      .send({
        email: 'novo@inv.com',
        senha: 'senhaForte1',
        perfil: 'FUNCIONARIO',
      })
      .expect(201);

    const body = res.body as Record<string, unknown>;
    expect(body).toMatchObject({
      email: 'novo@inv.com',
      perfil: 'FUNCIONARIO',
    });
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('senha');

    // Persistiu de fato no banco.
    const salvo = await prisma.user.findUnique({
      where: { email: 'novo@inv.com' },
    });
    expect(salvo?.perfil).toBe('FUNCIONARIO');
  });

  it('CLIENTE tentando criar → 403', async () => {
    const tokenCliente = await loginToken(
      app,
      'cliente@inv.com',
      'senhaForte1',
    );
    return request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', tokenCliente)
      .send({ email: 'x@inv.com', senha: 'senhaForte1', perfil: 'CLIENTE' })
      .expect(403);
  });

  it('sem token → 401', () => {
    return request(app.getHttpServer())
      .post('/usuarios')
      .send({ email: 'x@inv.com', senha: 'senhaForte1', perfil: 'CLIENTE' })
      .expect(401);
  });

  it('email duplicado → 409 (constraint UNIQUE real do Postgres)', async () => {
    await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', tokenAdmin)
      .send({ email: 'dup@inv.com', senha: 'senhaForte1', perfil: 'CLIENTE' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/usuarios')
      .set('Authorization', tokenAdmin)
      .send({ email: 'dup@inv.com', senha: 'senhaForte1', perfil: 'CLIENTE' })
      .expect(409);
  });
});
