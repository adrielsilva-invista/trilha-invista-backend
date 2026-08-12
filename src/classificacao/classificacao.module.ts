import { BullModule } from '@nestjs/bullmq';
import { InternalServerErrorException, Module } from '@nestjs/common';
import { HistoricoModule } from '../historico/historico.module';
import { ClassificarChamadoUseCase } from './application/classificar-chamado.usecase';
import {
  CLASSIFICADOR_GATEWAY,
  CLASSIFICACAO_STORE,
  FILA_CLASSIFICACAO,
} from './application/ports';
import { CLASSIFICACAO_QUEUE } from './infrastructure/classificacao.constants';
import { BullmqFilaClassificacao } from './infrastructure/bullmq-fila-classificacao';
import { ClassificacaoWorker } from './infrastructure/classificacao.worker';
import { ClaudeClassificadorGateway } from './infrastructure/claude-classificador.gateway';
import { PrismaClassificacaoStore } from './infrastructure/prisma-classificacao.store';

// HistoricoModule exporta RegistrarEventoUseCase (grava CLASSIFICACAO_IA, RF-11).
// FILA_CLASSIFICACAO é exportada pra AbrirChamado enfileirar após persistir.
@Module({
  imports: [
    BullModule.forRoot({ connection: conexaoRedis() }),
    BullModule.registerQueue({ name: CLASSIFICACAO_QUEUE }),
    HistoricoModule,
  ],
  providers: [
    ClassificarChamadoUseCase,
    ClassificacaoWorker,
    { provide: FILA_CLASSIFICACAO, useClass: BullmqFilaClassificacao },
    { provide: CLASSIFICADOR_GATEWAY, useClass: ClaudeClassificadorGateway },
    { provide: CLASSIFICACAO_STORE, useClass: PrismaClassificacaoStore },
  ],
  exports: [FILA_CLASSIFICACAO],
})
export class ClassificacaoModule {}

function conexaoRedis(): { host: string; port: number } {
  const raw = process.env.REDIS_URL;
  // Misconfiguração de deploy, não erro de request: falha o boot com exceção específica.
  if (!raw) throw new InternalServerErrorException('REDIS_URL não configurada');
  const url = new URL(raw);
  // ponytail: só host/port (basta p/ local+CI); auth/db do URL ignorados — subir se prod exigir.
  return { host: url.hostname, port: Number(url.port) || 6379 };
}
