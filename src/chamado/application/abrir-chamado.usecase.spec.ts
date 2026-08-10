import { AbrirChamadoUseCase } from './abrir-chamado.usecase';
import type { ChamadoRepository } from './ports';

describe('AbrirChamadoUseCase', () => {
  it('cria chamado AWAITING_CLASSIFICATION com o authorId do token', async () => {
    const criar = jest.fn().mockResolvedValue({
      id: 1,
      body: 'texto',
      status: 'AWAITING_CLASSIFICATION',
      authorId: 99,
      createdAt: new Date(0),
    });
    const repo: ChamadoRepository = {
      criar,
      buscarPorId: jest.fn(),
      atualizarStatus: jest.fn(),
    };
    const usecase = new AbrirChamadoUseCase(repo);

    const out = await usecase.executar('texto', 99);

    expect(criar).toHaveBeenCalledWith({
      body: 'texto',
      authorId: 99,
      status: 'AWAITING_CLASSIFICATION',
    });
    expect(out.id).toBe(1);
  });
});
