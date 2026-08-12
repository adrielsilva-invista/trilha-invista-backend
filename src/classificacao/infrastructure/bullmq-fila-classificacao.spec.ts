import { BullmqFilaClassificacao } from './bullmq-fila-classificacao';
import type { Queue } from 'bullmq';

describe('BullmqFilaClassificacao', () => {
  it('enfileira com jobId = ticketId (idempotência de enfileiramento)', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const fila = new BullmqFilaClassificacao({ add } as unknown as Queue);

    await fila.enfileirar(7);

    expect(add).toHaveBeenCalledWith(
      'classificar',
      { ticketId: 7 },
      { jobId: '7' },
    );
  });
});
