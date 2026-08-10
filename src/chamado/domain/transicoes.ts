// Domínio puro: sem @nestjs, sem @prisma. Máquina de estados do chamado (RF-09).
import type { TicketStatus } from './chamado';

// Transições permitidas por estado. Estado ausente do mapa (RESOLVED/CANCELLED)
// é final: rejeita qualquer transição. AWAITING_CLASSIFICATION → OPEN é disparado
// pela classificação (RF-08) — Sprint-2; aqui o único caminho de saída é CANCELLED.
const TRANSICOES: Record<TicketStatus, TicketStatus[]> = {
  AWAITING_CLASSIFICATION: ['CANCELLED'],
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
};

export function podeTransitar(de: TicketStatus, para: TicketStatus): boolean {
  return TRANSICOES[de].includes(para);
}

// Perfil como literal próprio: chamado/domain não depende de auth/domain (isolamento).
type PerfilLiteral = 'CLIENTE' | 'FUNCIONARIO' | 'ADMIN';

// Autorização de QUEM pode transicionar (independe de o estado atual permitir):
// - cancelar (→ CANCELLED): só ADMIN.
// - conduzir (→ IN_PROGRESS/RESOLVED): só o FUNCIONARIO atribuído ao chamado.
// ponytail: ADMIN não conduz (só cancela) — literal à Sprint-1.md TASK-05.
//   Se o negócio quiser ADMIN-conduz, liberar aqui.
export function autorizadoATransicionar(
  perfil: PerfilLiteral,
  para: TicketStatus,
  atribuidoAoUsuario: boolean,
): boolean {
  if (para === 'CANCELLED') return perfil === 'ADMIN';
  return perfil === 'FUNCIONARIO' && atribuidoAoUsuario;
}
