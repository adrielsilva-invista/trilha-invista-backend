// Domínio puro: sem @nestjs, sem @prisma. Ver standards/clean-architecture.md.

export type TicketStatus =
  'AWAITING_CLASSIFICATION' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

// Chamado recém-aberto, antes de persistir (sem id/timestamps — a infra os gera).
export interface NovoChamado {
  body: string;
  authorId: number;
  status: TicketStatus;
}

// Invariante de abertura (RF-03, D-05): todo chamado nasce AWAITING_CLASSIFICATION.
// Nada o move para OPEN nesta sprint — o gatilho é a classificação (RF-04, Sprint-2).
export function abrirChamado(body: string, authorId: number): NovoChamado {
  return { body, authorId, status: 'AWAITING_CLASSIFICATION' };
}
