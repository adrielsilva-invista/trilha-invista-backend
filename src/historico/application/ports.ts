import type { EventoHistorico, NovoEvento } from '../domain/evento';

// Estado do ticket necessário para autorizar a leitura do histórico (RF-11):
// existência (404) + a quem está atribuído (funcionário só vê o dele → 403).
export interface TicketDoHistorico {
  id: number;
  assigneeId: number | null;
}

// Append-only por contrato: não há update/delete de evento (imutabilidade RF-11).
export interface HistoricoRepository {
  registrar(evento: NovoEvento): Promise<void>;
  listarPorTicket(ticketId: number): Promise<EventoHistorico[]>;
  buscarTicket(ticketId: number): Promise<TicketDoHistorico | null>;
}

export const HISTORICO_REPOSITORY = 'HISTORICO_REPOSITORY';
