import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EventoHistorico } from '../domain/evento';
import { eventosVisiveisParaFuncionario } from '../domain/evento';
import type { HistoricoRepository } from './ports';
import { HISTORICO_REPOSITORY } from './ports';

type PerfilLiteral = 'CLIENTE' | 'FUNCIONARIO' | 'ADMIN';

// Humble object: autoriza e delega o recorte de visão ao domínio (RF-11).
// CLIENTE já é barrado no guard; aqui chegam só ADMIN e FUNCIONARIO.
@Injectable()
export class ListarHistoricoUseCase {
  constructor(
    @Inject(HISTORICO_REPOSITORY)
    private readonly historico: HistoricoRepository,
  ) {}

  async executar(
    ticketId: number,
    usuarioId: number,
    perfil: PerfilLiteral,
  ): Promise<EventoHistorico[]> {
    const ticket = await this.historico.buscarTicket(ticketId);
    if (ticket === null) throw new NotFoundException('Chamado não encontrado');

    const eventos = await this.historico.listarPorTicket(ticketId);
    if (perfil === 'ADMIN') return eventos;

    // FUNCIONARIO: só o chamado atribuído a ele (anti-IDOR) e visão restrita.
    if (ticket.assigneeId !== usuarioId) {
      throw new ForbiddenException('Chamado não atribuído a você');
    }
    return eventosVisiveisParaFuncionario(eventos, usuarioId);
  }
}
