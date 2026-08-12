import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { FilaClassificacao } from '../application/ports';
import { CLASSIFICACAO_QUEUE } from './classificacao.constants';

@Injectable()
export class BullmqFilaClassificacao implements FilaClassificacao {
  constructor(@InjectQueue(CLASSIFICACAO_QUEUE) private readonly fila: Queue) {}

  async enfileirar(ticketId: number): Promise<void> {
    // jobId = ticketId → BullMQ ignora enfileiramento duplicado do mesmo chamado.
    await this.fila.add(
      'classificar',
      { ticketId },
      { jobId: String(ticketId) },
    );
  }
}
