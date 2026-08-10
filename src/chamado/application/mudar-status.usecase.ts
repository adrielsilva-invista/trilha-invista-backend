import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import type { TicketStatus } from '../domain/chamado';
import { podeTransitar, autorizadoATransicionar } from '../domain/transicoes';
import type { ChamadoCriado, ChamadoRepository } from './ports';
import { CHAMADO_REPOSITORY } from './ports';

type PerfilLiteral = 'CLIENTE' | 'FUNCIONARIO' | 'ADMIN';

// Humble object: só orquestra. As duas regras (pode? autorizado?) vivem no domain.
@Injectable()
export class MudarStatusUseCase {
  constructor(
    @Inject(CHAMADO_REPOSITORY) private readonly chamados: ChamadoRepository,
  ) {}

  async executar(
    id: number,
    para: TicketStatus,
    usuarioId: number,
    perfil: PerfilLiteral,
  ): Promise<ChamadoCriado> {
    const chamado = await this.chamados.buscarPorId(id);
    if (chamado === null) throw new NotFoundException('Chamado não encontrado');

    const atribuidoAoUsuario = chamado.assigneeId === usuarioId;
    if (!autorizadoATransicionar(perfil, para, atribuidoAoUsuario)) {
      throw new ForbiddenException('Sem permissão para esta transição');
    }
    if (!podeTransitar(chamado.status, para)) {
      throw new ConflictException(
        `Transição inválida: ${chamado.status} → ${para}`,
      );
    }
    return this.chamados.atualizarStatus(id, para);
  }
}
