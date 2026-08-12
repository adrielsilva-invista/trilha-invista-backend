import { AbrirChamadoUseCase } from './abrir-chamado.usecase';
import type { ChamadoRepository } from './ports';
import type { FilaClassificacao } from '../../classificacao/application/ports';

describe('AbrirChamadoUseCase', () => {
  it('cria chamado AWAITING_CLASSIFICATION e enfileira a classificação (RF-06)', async () => {
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
      listarPorAutor: jest.fn(),
    };
    const enfileirar = jest.fn().mockResolvedValue(undefined);
    const fila: FilaClassificacao = { enfileirar };
    const usecase = new AbrirChamadoUseCase(repo, fila);

    const out = await usecase.executar('texto', 99);

    expect(criar).toHaveBeenCalledWith({
      body: 'texto',
      authorId: 99,
      status: 'AWAITING_CLASSIFICATION',
    });
    expect(enfileirar).toHaveBeenCalledWith(1);
    expect(out.id).toBe(1);
  });
});
