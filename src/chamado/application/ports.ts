import type { NovoChamado, TicketStatus } from '../domain/chamado';

// Saída: o que a API devolve ao cliente ao abrir o chamado (RF-03).
export interface ChamadoCriado {
  id: number;
  body: string;
  status: TicketStatus;
  authorId: number;
  createdAt: Date;
}

export interface ChamadoRepository {
  criar(chamado: NovoChamado): Promise<ChamadoCriado>;
}

export const CHAMADO_REPOSITORY = 'CHAMADO_REPOSITORY';
