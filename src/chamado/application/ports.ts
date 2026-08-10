import type { NovoChamado, TicketStatus } from '../domain/chamado';

// Saída: o que a API devolve ao cliente ao abrir o chamado (RF-03).
export interface ChamadoCriado {
  id: number;
  body: string;
  status: TicketStatus;
  authorId: number;
  createdAt: Date;
}

// Estado necessário para decidir a transição (RF-09): status atual + a quem
// o chamado está atribuído (regra "funcionário só no chamado dele").
export interface ChamadoEstado {
  id: number;
  status: TicketStatus;
  assigneeId: number | null;
}

export interface ChamadoRepository {
  criar(chamado: NovoChamado): Promise<ChamadoCriado>;
  buscarPorId(id: number): Promise<ChamadoEstado | null>;
  atualizarStatus(id: number, status: TicketStatus): Promise<ChamadoCriado>;
}

export const CHAMADO_REPOSITORY = 'CHAMADO_REPOSITORY';
