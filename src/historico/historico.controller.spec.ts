import { HistoricoController } from './historico.controller';
import type { ListarHistoricoUseCase } from './application/listar-historico.usecase';

describe('HistoricoController', () => {
  it('delega id e (sub, perfil) do token — nunca de parâmetro externo (anti-IDOR)', async () => {
    const executar = jest.fn().mockResolvedValue([{ id: 1 }]);
    const listar = { executar } as unknown as ListarHistoricoUseCase;
    const controller = new HistoricoController(listar);

    await controller.historico(7, { user: { sub: 42, perfil: 'FUNCIONARIO' } });

    expect(executar).toHaveBeenCalledWith(7, 42, 'FUNCIONARIO');
  });
});
