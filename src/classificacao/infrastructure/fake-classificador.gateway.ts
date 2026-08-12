import { Injectable } from '@nestjs/common';
import type {
  ClassificadorGateway,
  ResultadoClassificacao,
} from '../application/ports';

// ponytail: gateway FAKE — retorno fixo, zero API. Substituído pelo
// ClaudeClassificadorGateway (tool use) na TASK-10; só existe pra provar a fila.
@Injectable()
export class FakeClassificadorGateway implements ClassificadorGateway {
  classificar(): Promise<ResultadoClassificacao> {
    return Promise.resolve({
      categoria: 'OUTROS',
      prioridade: 'MEDIA',
      area: 'SUPORTE_TECNICO',
      sentimento: 'NEUTRO',
      resumo: 'Classificação automática pendente da IA real (TASK-10).',
      modelo: 'fake',
      versao: '0',
    });
  }
}
