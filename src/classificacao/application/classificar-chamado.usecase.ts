import { Inject, Injectable, Logger } from '@nestjs/common';
import { RegistrarEventoUseCase } from '../../historico/application/registrar-evento.usecase';
import { selecionarMenorCarga } from '../domain/atribuicao';
import { ehTransitorio } from '../domain/politica-retry';
import type {
  ClassificadorGateway,
  ClassificacaoStore,
  ResultadoClassificacao,
} from './ports';
import { CLASSIFICADOR_GATEWAY, CLASSIFICACAO_STORE } from './ports';

@Injectable()
export class ClassificarChamadoUseCase {
  constructor(
    @Inject(CLASSIFICACAO_STORE) private readonly store: ClassificacaoStore,
    @Inject(CLASSIFICADOR_GATEWAY)
    private readonly gateway: ClassificadorGateway,
    private readonly registrarEvento: RegistrarEventoUseCase,
  ) {}

  private readonly logger = new Logger(ClassificarChamadoUseCase.name);

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

    let resultado: ResultadoClassificacao;
    try {
      resultado = await this.classificarComRetry(ticket.body);
    } catch (erro) {
      // Falha esgotada (RF-05): não bloqueia o chamado — fica manual e é atribuído.
      await this.fallbackManual(ticketId, erro);
      return;
    }

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

  // RF-05: falha transitória (timeout/429/5xx/valor fora do enum) vale 1 retry;
  // definitiva (401/403) não insiste. O timeout em si vive no gateway (SDK).
  private async classificarComRetry(
    body: string,
  ): Promise<ResultadoClassificacao> {
    try {
      return await this.gateway.classificar(body);
    } catch (erro) {
      if (!ehTransitorio(erro)) throw erro;
      return await this.gateway.classificar(body); // 1 retry; nova falha propaga
    }
  }

  // Esgotado o retry: chamado fica AWAITING_CLASSIFICATION + manual pendente, é
  // atribuído ao de menor carga (RF-07) e registra FALHA_CLASSIFICACAO (sistema).
  private async fallbackManual(ticketId: number, erro: unknown): Promise<void> {
    const assigneeId = selecionarMenorCarga(
      await this.store.cargasDosFuncionarios(),
    );
    await this.store.marcarFalhaEAtribuir(ticketId, assigneeId);
    const motivo = erro instanceof Error ? erro.message : 'erro desconhecido';
    this.logger.warn(
      `IA falhou no ticket ${ticketId} (${motivo}); manual pendente, assignee=${assigneeId ?? 'nenhum'}`,
    );
    await this.registrarEvento.executar({
      ticketId,
      type: 'FALHA_CLASSIFICACAO',
      payload: { motivo, assigneeId },
      authorId: null,
    });
  }
}
