import { Inject, Injectable } from '@nestjs/common';
import type { NovoEvento } from '../domain/evento';
import type { HistoricoRepository } from './ports';
import { HISTORICO_REPOSITORY } from './ports';

// Porta única de gravação do histórico (RF-11). As TASKs 11/12/13 reusam isto —
// nunca duplicar a gravação de evento.
@Injectable()
export class RegistrarEventoUseCase {
  constructor(
    @Inject(HISTORICO_REPOSITORY)
    private readonly historico: HistoricoRepository,
  ) {}

  executar(evento: NovoEvento): Promise<void> {
    return this.historico.registrar(evento);
  }
}
