import { ChamadoController } from './chamado.controller';
import type { AbrirChamadoUseCase } from './application/abrir-chamado.usecase';

describe('ChamadoController', () => {
  it('delega ao use case com o body e o authorId do token (não do body)', async () => {
    const executar = jest.fn().mockResolvedValue({ id: 1 });
    const usecase = { executar } as unknown as AbrirChamadoUseCase;
    const controller = new ChamadoController(usecase);

    await controller.abrirChamado({ body: 'texto' }, { user: { sub: 77 } });

    expect(executar).toHaveBeenCalledWith('texto', 77);
  });
});
