import { PrismaChamadoRepository } from './prisma-chamado.repository';
import type { PrismaService } from '../../prisma/prisma.service';

describe('PrismaChamadoRepository', () => {
  it('persiste o chamado e retorna só os campos públicos', async () => {
    const created = {
      id: 5,
      body: 'texto',
      status: 'AWAITING_CLASSIFICATION',
      authorId: 3,
      createdAt: new Date(0),
    };
    const create = jest.fn().mockResolvedValue(created);
    const prisma = { ticket: { create } } as unknown as PrismaService;
    const repo = new PrismaChamadoRepository(prisma);

    const out = await repo.criar({
      body: 'texto',
      authorId: 3,
      status: 'AWAITING_CLASSIFICATION',
    });

    expect(create).toHaveBeenCalledWith({
      data: { body: 'texto', authorId: 3, status: 'AWAITING_CLASSIFICATION' },
      select: {
        id: true,
        body: true,
        status: true,
        authorId: true,
        createdAt: true,
      },
    });
    expect(out).toBe(created);
  });

  it('buscarPorId filtra soft-deleted e traz status + assigneeId', async () => {
    const estado = { id: 7, status: 'OPEN', assigneeId: 42 };
    const findFirst = jest.fn().mockResolvedValue(estado);
    const prisma = { ticket: { findFirst } } as unknown as PrismaService;
    const repo = new PrismaChamadoRepository(prisma);

    const out = await repo.buscarPorId(7);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 7, deletedAt: null },
      select: { id: true, status: true, assigneeId: true },
    });
    expect(out).toBe(estado);
  });

  it('atualizarStatus grava o novo status e retorna campos públicos', async () => {
    const updated = {
      id: 7,
      body: 'x',
      status: 'IN_PROGRESS',
      authorId: 3,
      createdAt: new Date(0),
    };
    const update = jest.fn().mockResolvedValue(updated);
    const prisma = { ticket: { update } } as unknown as PrismaService;
    const repo = new PrismaChamadoRepository(prisma);

    const out = await repo.atualizarStatus(7, 'IN_PROGRESS');

    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'IN_PROGRESS' },
      select: {
        id: true,
        body: true,
        status: true,
        authorId: true,
        createdAt: true,
      },
    });
    expect(out).toBe(updated);
  });
});
