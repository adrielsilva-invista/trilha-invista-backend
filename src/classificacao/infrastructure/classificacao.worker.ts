import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ClassificarChamadoUseCase } from '../application/classificar-chamado.usecase';
import { CLASSIFICACAO_QUEUE } from './classificacao.constants';

// concurrency 1 = serializa o processamento (RF-06). Humble object: só desempacota
// o job e delega ao use case — nenhuma regra de negócio mora aqui.
@Processor(CLASSIFICACAO_QUEUE, { concurrency: 1 })
export class ClassificacaoWorker extends WorkerHost {
  constructor(private readonly classificar: ClassificarChamadoUseCase) {
    super();
  }

  async process(job: Job<{ ticketId: number }>): Promise<void> {
    await this.classificar.executar(job.data.ticketId);
  }
}
