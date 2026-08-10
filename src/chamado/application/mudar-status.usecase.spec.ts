import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { MudarStatusUseCase } from './mudar-status.usecase';
import type { ChamadoEstado, ChamadoRepository } from './ports';
import type { TicketStatus } from '../domain/chamado';

function makeRepo(estado: ChamadoEstado | null) {
  return {
    criar: jest.fn(),
    buscarPorId: jest.fn().mockResolvedValue(estado),
    atualizarStatus: jest
      .fn()
      .mockImplementation((id: number, status: TicketStatus) =>
        Promise.resolve({
          id,
          body: 'x',
          status,
          authorId: 1,
          createdAt: new Date(0),
        }),
      ),
  } satisfies ChamadoRepository;
}

describe('MudarStatusUseCase', () => {
  it('funcionário atribuído conduz OPEN → IN_PROGRESS e persiste', async () => {
    const repo = makeRepo({ id: 7, status: 'OPEN', assigneeId: 42 });
    const uc = new MudarStatusUseCase(repo);
    const out = await uc.executar(7, 'IN_PROGRESS', 42, 'FUNCIONARIO');
    expect(out.status).toBe('IN_PROGRESS');
    expect(repo.atualizarStatus).toHaveBeenCalledWith(7, 'IN_PROGRESS');
  });

  it('404 quando chamado não existe', async () => {
    const repo = makeRepo(null);
    const uc = new MudarStatusUseCase(repo);
    await expect(uc.executar(9, 'CANCELLED', 1, 'ADMIN')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('403 quando funcionário não é o atribuído', async () => {
    const repo = makeRepo({ id: 7, status: 'OPEN', assigneeId: 99 });
    const uc = new MudarStatusUseCase(repo);
    await expect(
      uc.executar(7, 'IN_PROGRESS', 42, 'FUNCIONARIO'),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.atualizarStatus).not.toHaveBeenCalled();
  });

  it('409 em transição inválida mesmo autorizado (ADMIN cancela final)', async () => {
    const repo = makeRepo({ id: 7, status: 'RESOLVED', assigneeId: null });
    const uc = new MudarStatusUseCase(repo);
    await expect(uc.executar(7, 'CANCELLED', 1, 'ADMIN')).rejects.toThrow(
      ConflictException,
    );
  });
});
