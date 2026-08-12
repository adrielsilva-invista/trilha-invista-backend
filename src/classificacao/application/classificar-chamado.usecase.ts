import { Inject, Injectable } from '@nestjs/common';
import { RegistrarEventoUseCase } from '../../historico/application/registrar-evento.usecase';
import { selecionarMenorCarga } from '../domain/atribuicao';
import type { ClassificadorGateway, ClassificacaoStore } from './ports';
import { CLASSIFICADOR_GATEWAY, CLASSIFICACAO_STORE } from './ports';

@Injectable()
export class ClassificarChamadoUseCase {
  constructor(
    @Inject(CLASSIFICACAO_STORE) private readonly store: ClassificacaoStore,
    @Inject(CLASSIFICADOR_GATEWAY)
    private readonly gateway: ClassificadorGateway,
    private readonly registrarEvento: RegistrarEventoUseCase,
  ) {}

  // Chamado pelo worker (RF-06). Relê o ticket e DESCARTA se saiu de
  // AWAITING_CLASSIFICATION (cancelado durante o processamento / já classificado):
  // é o que dá idempotência por ticketId e reconfirma elegibilidade antes de persistir.
  //
  // Caminho feliz (RF-04 + RF-07): classifica → salva original+final → atribui ao de
  // menor carga → transita AWAITING → OPEN. Ordem importa: atribui ANTES de abrir.
  // authorId null nos 3 eventos = sistema (ação automática).
  async executar(ticketId: number): Promise<void> {
    const ticket = await this.store.buscar(ticketId);
    if (!ticket || ticket.status !== 'AWAITING_CLASSIFICATION') return;

    const resultado = await this.gateway.classificar(ticket.body);
    await this.store.salvarClassificacao(ticketId, resultado);
    await this.registrarEvento.executar({
      ticketId,
      type: 'CLASSIFICACAO_IA',
      payload: { ...resultado },
      authorId: null,
    });

    const assigneeId = selecionarMenorCarga(
      await this.store.cargasDosFuncionarios(),
    );
    await this.store.atribuirEAbrir(ticketId, assigneeId);
    if (assigneeId !== null) {
      await this.registrarEvento.executar({
        ticketId,
        type: 'ATRIBUICAO',
        payload: { assigneeId },
        authorId: null,
      });
    }
    await this.registrarEvento.executar({
      ticketId,
      type: 'MUDANCA_STATUS',
      payload: { de: 'AWAITING_CLASSIFICATION', para: 'OPEN' },
      authorId: null,
    });
  }
}
