import { ChamadoController } from './chamado.controller';
import type { AbrirChamadoUseCase } from './application/abrir-chamado.usecase';
import type { MudarStatusUseCase } from './application/mudar-status.usecase';

describe('ChamadoController', () => {
  it('abrir: delega com body e authorId do token (não do body)', async () => {
    const executar = jest.fn().mockResolvedValue({ id: 1 });
    const abrir = { executar } as unknown as AbrirChamadoUseCase;
    const mudar = { executar: jest.fn() } as unknown as MudarStatusUseCase;
    const controller = new ChamadoController(abrir, mudar);

    await controller.abrirChamado(
      { body: 'texto' },
      { user: { sub: 77, perfil: 'CLIENTE' } },
    );

    expect(executar).toHaveBeenCalledWith('texto', 77);
  });

  it('transicionar: delega id, status e (sub, perfil) do token', async () => {
    const executar = jest.fn().mockResolvedValue({ id: 7, status: 'RESOLVED' });
    const abrir = { executar: jest.fn() } as unknown as AbrirChamadoUseCase;
    const mudar = { executar } as unknown as MudarStatusUseCase;
    const controller = new ChamadoController(abrir, mudar);

    await controller.transicionar(
      7,
      { status: 'RESOLVED' },
      { user: { sub: 42, perfil: 'FUNCIONARIO' } },
    );

    expect(executar).toHaveBeenCalledWith(7, 'RESOLVED', 42, 'FUNCIONARIO');
  });
});
