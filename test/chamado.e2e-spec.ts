import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { bootApp, truncar, semearUsuario, loginToken } from './helpers';

// e2e REAL: persistência e máquina de estados batem no Postgres do container.
describe('Chamados (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let clienteId: number;
  let funcionarioId: number;
  let tokenCliente: string;
  let tokenFuncionario: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
  });

  beforeEach(async () => {
    await truncar(prisma);
    clienteId = await semearUsuario(
      prisma,
      'cli@inv.com',
      'senhaForte1',
      'CLIENTE',
    );
    funcionarioId = await semearUsuario(
      prisma,
      'fun@inv.com',
      'senhaForte1',
      'FUNCIONARIO',
    );
    await semearUsuario(prisma, 'adm@inv.com', 'senhaForte1', 'ADMIN');
    tokenCliente = await loginToken(app, 'cli@inv.com', 'senhaForte1');
    tokenFuncionario = await loginToken(app, 'fun@inv.com', 'senhaForte1');
    tokenAdmin = await loginToken(app, 'adm@inv.com', 'senhaForte1');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /chamados', () => {
    it('CLIENTE abre chamado → 201, nasce AWAITING_CLASSIFICATION e persiste', async () => {
      const res = await request(app.getHttpServer())
        .post('/chamados')
        .set('Authorization', tokenCliente)
        .send({ body: 'Não consigo acessar minha conta' })
        .expect(201);

      const body = res.body as { id: number; status: string; authorId: number };
      expect(body.status).toBe('AWAITING_CLASSIFICATION');
      expect(body.authorId).toBe(clienteId);

      const salvo = await prisma.ticket.findUnique({ where: { id: body.id } });
      expect(salvo?.status).toBe('AWAITING_CLASSIFICATION');
      expect(salvo?.authorId).toBe(clienteId);
    });

    it('corpo só-espaços → 400 (trim no trust boundary)', () => {
      return request(app.getHttpServer())
        .post('/chamados')
        .set('Authorization', tokenCliente)
        .send({ body: '   ' })
        .expect(400);
    });

    it('ADMIN tentando abrir → 403 (só CLIENTE)', () => {
      return request(app.getHttpServer())
        .post('/chamados')
        .set('Authorization', tokenAdmin)
        .send({ body: 'texto válido' })
        .expect(403);
    });

    it('sem token → 401', () => {
      return request(app.getHttpServer())
        .post('/chamados')
        .send({ body: 'texto válido' })
        .expect(401);
    });
  });

  describe('PATCH /chamados/:id/status', () => {
    it('FUNCIONARIO atribuído conduz OPEN → IN_PROGRESS → 200 e persiste', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          body: 'em aberto',
          status: 'OPEN',
          authorId: clienteId,
          assigneeId: funcionarioId,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/chamados/${ticket.id}/status`)
        .set('Authorization', tokenFuncionario)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect((res.body as { status: string }).status).toBe('IN_PROGRESS');
      const salvo = await prisma.ticket.findUnique({
        where: { id: ticket.id },
      });
      expect(salvo?.status).toBe('IN_PROGRESS');
    });

    it('ADMIN cancela chamado AWAITING → 200', async () => {
      const ticket = await prisma.ticket.create({
        data: {
          body: 'novo',
          status: 'AWAITING_CLASSIFICATION',
          authorId: clienteId,
        },
      });

      return request(app.getHttpServer())
        .patch(`/chamados/${ticket.id}/status`)
        .set('Authorization', tokenAdmin)
        .send({ status: 'CANCELLED' })
        .expect(200);
    });

    it('transição a partir de estado final (RESOLVED) → 409', async () => {
      const ticket = await prisma.ticket.create({
        data: { body: 'resolvido', status: 'RESOLVED', authorId: clienteId },
      });

      return request(app.getHttpServer())
        .patch(`/chamados/${ticket.id}/status`)
        .set('Authorization', tokenAdmin)
        .send({ status: 'CANCELLED' })
        .expect(409);
    });

    it('id inexistente → 404', () => {
      return request(app.getHttpServer())
        .patch('/chamados/999999/status')
        .set('Authorization', tokenAdmin)
        .send({ status: 'CANCELLED' })
        .expect(404);
    });

    it('CLIENTE tentando transicionar → 403 (guard)', async () => {
      const ticket = await prisma.ticket.create({
        data: { body: 'x', status: 'OPEN', authorId: clienteId },
      });

      return request(app.getHttpServer())
        .patch(`/chamados/${ticket.id}/status`)
        .set('Authorization', tokenCliente)
        .send({ status: 'IN_PROGRESS' })
        .expect(403);
    });
  });

  describe('GET /chamados (RF-10, anti-IDOR)', () => {
    it('CLIENTE vê só os próprios chamados, nunca os de outro cliente', async () => {
      const clienteB = await semearUsuario(
        prisma,
        'cliB@inv.com',
        'senhaForte1',
        'CLIENTE',
      );
      await prisma.ticket.create({
        data: { body: 'meu 1', authorId: clienteId },
      });
      await prisma.ticket.create({
        data: { body: 'meu 2', authorId: clienteId },
      });
      await prisma.ticket.create({
        data: { body: 'do B', authorId: clienteB },
      });

      const res = await request(app.getHttpServer())
        .get('/chamados')
        .set('Authorization', tokenCliente)
        .expect(200);

      const lista = res.body as { id: number; body: string }[];
      expect(lista).toHaveLength(2);
      expect(lista.map((c) => c.body).sort()).toEqual(['meu 1', 'meu 2']);
    });

    it('sem token → 401', () => {
      return request(app.getHttpServer()).get('/chamados').expect(401);
    });

    it('ADMIN → 403 (endpoint é só do CLIENTE nesta sprint)', () => {
      return request(app.getHttpServer())
        .get('/chamados')
        .set('Authorization', tokenAdmin)
        .expect(403);
    });
  });
});
