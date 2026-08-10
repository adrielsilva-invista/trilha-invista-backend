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
});
