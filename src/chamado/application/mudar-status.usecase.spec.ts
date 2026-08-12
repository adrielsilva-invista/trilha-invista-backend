import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { MudarStatusUseCase } from './mudar-status.usecase';
import type { ChamadoEstado, ChamadoRepository } from './ports';
import type { TicketStatus } from '../domain/chamado';
import type { RegistrarEventoUseCase } from '../../historico/application/registrar-evento.usecase';

function makeRepo(estado: ChamadoEstado | null) {
  return {
    criar: jest.fn(),
    listarPorAutor: jest.fn(),
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

function makeRegistrar() {
  return { executar: jest.fn().mockResolvedValue(undefined) };
}

function makeUseCase(
  repo: ChamadoRepository,
  registrar: ReturnType<typeof makeRegistrar>,
) {
  return new MudarStatusUseCase(
    repo,
    registrar as unknown as RegistrarEventoUseCase,
  );
}

describe('MudarStatusUseCase', () => {
  it('funcionário atribuído conduz OPEN → IN_PROGRESS, persiste e registra MUDANCA_STATUS', async () => {
    const repo = makeRepo({ id: 7, status: 'OPEN', assigneeId: 42 });
    const registrar = makeRegistrar();
    const uc = makeUseCase(repo, registrar);
    const out = await uc.executar(7, 'IN_PROGRESS', 42, 'FUNCIONARIO');
    expect(out.status).toBe('IN_PROGRESS');
    expect(repo.atualizarStatus).toHaveBeenCalledWith(7, 'IN_PROGRESS');
    expect(registrar.executar).toHaveBeenCalledWith({
      ticketId: 7,
      type: 'MUDANCA_STATUS',
      payload: { de: 'OPEN', para: 'IN_PROGRESS' },
      authorId: 42,
    });
  });

  it('404 quando chamado não existe', async () => {
    const uc = makeUseCase(makeRepo(null), makeRegistrar());
    await expect(uc.executar(9, 'CANCELLED', 1, 'ADMIN')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('403 quando funcionário não é o atribuído (não persiste nem registra)', async () => {
    const repo = makeRepo({ id: 7, status: 'OPEN', assigneeId: 99 });
    const registrar = makeRegistrar();
    const uc = makeUseCase(repo, registrar);
    await expect(
      uc.executar(7, 'IN_PROGRESS', 42, 'FUNCIONARIO'),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.atualizarStatus).not.toHaveBeenCalled();
    expect(registrar.executar).not.toHaveBeenCalled();
  });

  it('409 em transição inválida mesmo autorizado (ADMIN cancela final)', async () => {
    const repo = makeRepo({ id: 7, status: 'RESOLVED', assigneeId: null });
    const uc = makeUseCase(repo, makeRegistrar());
    await expect(uc.executar(7, 'CANCELLED', 1, 'ADMIN')).rejects.toThrow(
      ConflictException,
    );
  });
});
