import { RegistrarEventoUseCase } from './registrar-evento.usecase';
import type { HistoricoRepository } from './ports';

describe('RegistrarEventoUseCase', () => {
  it('repassa o evento ao repositório append-only', async () => {
    const registrar = jest.fn().mockResolvedValue(undefined);
    const repo = { registrar } as unknown as HistoricoRepository;
    const uc = new RegistrarEventoUseCase(repo);

    const evento = {
      ticketId: 7,
      type: 'MUDANCA_STATUS' as const,
      payload: { de: 'OPEN', para: 'IN_PROGRESS' },
      authorId: 42,
    };
    await uc.executar(evento);

    expect(registrar).toHaveBeenCalledWith(evento);
  });
});
