import { ListarMeusChamadosUseCase } from './listar-meus-chamados.usecase';
import type { ChamadoRepository } from './ports';

describe('ListarMeusChamadosUseCase', () => {
  it('filtra pelo autorId recebido (token), repassando ao repo', async () => {
    const listarPorAutor = jest.fn().mockResolvedValue([{ id: 1 }]);
    const repo = { listarPorAutor } as unknown as ChamadoRepository;
    const useCase = new ListarMeusChamadosUseCase(repo);

    const r = await useCase.executar(77);

    expect(listarPorAutor).toHaveBeenCalledWith(77);
    expect(r).toEqual([{ id: 1 }]);
  });
});
