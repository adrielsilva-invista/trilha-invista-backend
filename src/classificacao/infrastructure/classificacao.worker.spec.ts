import { ClassificacaoWorker } from './classificacao.worker';
import type { Job } from 'bullmq';
import type { ClassificarChamadoUseCase } from '../application/classificar-chamado.usecase';

describe('ClassificacaoWorker', () => {
  it('delega o ticketId do job ao use case', async () => {
    const executar = jest.fn().mockResolvedValue(undefined);
    const worker = new ClassificacaoWorker({
      executar,
    } as unknown as ClassificarChamadoUseCase);

    await worker.process({ data: { ticketId: 7 } } as Job<{
      ticketId: number;
    }>);

    expect(executar).toHaveBeenCalledWith(7);
  });
});
