// Domínio puro: sem @nestjs, sem @prisma. Ver standards/clean-architecture.md.

// Espelha o enum TicketEventType do schema (RF-11).
export type TicketEventType =
  | 'CLASSIFICACAO_IA'
  | 'FALHA_CLASSIFICACAO'
  | 'RECLASSIFICACAO'
  | 'ATRIBUICAO'
  | 'MUDANCA_STATUS';

// Evento a gravar, antes de persistir (a infra gera id/createdAt).
// authorId null = "sistema" (classificação/atribuição automática, RF-11).
export interface NovoEvento {
  ticketId: number;
  type: TicketEventType;
  payload: Record<string, unknown>;
  authorId: number | null;
}

// Evento já persistido, como sai do histórico.
export interface EventoHistorico {
  id: number;
  ticketId: number;
  type: TicketEventType;
  payload: unknown;
  authorId: number | null;
  createdAt: Date;
}

// RF-11: o funcionário NÃO vê o log completo de auditoria — só a classificação
// original da IA e as próprias reclassificações. Admin vê tudo (não passa por aqui).
export function eventosVisiveisParaFuncionario(
  eventos: EventoHistorico[],
  funcionarioId: number,
): EventoHistorico[] {
  return eventos.filter(
    (e) =>
      e.type === 'CLASSIFICACAO_IA' ||
      (e.type === 'RECLASSIFICACAO' && e.authorId === funcionarioId),
  );
}
