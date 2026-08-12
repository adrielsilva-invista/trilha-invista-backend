import { PrismaHistoricoRepository } from './prisma-historico.repository';
import type { PrismaService } from '../../prisma/prisma.service';

describe('PrismaHistoricoRepository', () => {
  it('registrar grava o evento (append-only, sem update/delete)', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const prisma = { ticketEvent: { create } } as unknown as PrismaService;
    const repo = new PrismaHistoricoRepository(prisma);

    await repo.registrar({
      ticketId: 7,
      type: 'MUDANCA_STATUS',
      payload: { de: 'OPEN', para: 'IN_PROGRESS' },
      authorId: 42,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        ticketId: 7,
        type: 'MUDANCA_STATUS',
        payload: { de: 'OPEN', para: 'IN_PROGRESS' },
        authorId: 42,
      },
    });
  });

  it('listarPorTicket busca em ordem cronológica crescente', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { ticketEvent: { findMany } } as unknown as PrismaService;
    const repo = new PrismaHistoricoRepository(prisma);

    await repo.listarPorTicket(7);

    expect(findMany).toHaveBeenCalledWith({
      where: { ticketId: 7 },
      select: {
        id: true,
        ticketId: true,
        type: true,
        payload: true,
        authorId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('buscarTicket filtra soft-deleted e traz só id + assigneeId', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 7, assigneeId: 42 });
    const prisma = { ticket: { findFirst } } as unknown as PrismaService;
    const repo = new PrismaHistoricoRepository(prisma);

    const out = await repo.buscarTicket(7);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 7, deletedAt: null },
      select: { id: true, assigneeId: true },
    });
    expect(out).toEqual({ id: 7, assigneeId: 42 });
  });
});
