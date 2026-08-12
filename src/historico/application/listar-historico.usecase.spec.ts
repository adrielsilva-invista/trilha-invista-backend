import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListarHistoricoUseCase } from './listar-historico.usecase';
import type { HistoricoRepository, TicketDoHistorico } from './ports';
import type { EventoHistorico } from '../domain/evento';
import { evt } from '../domain/evento.fixture';

type PerfilLiteral = 'CLIENTE' | 'FUNCIONARIO' | 'ADMIN';

function makeRepo(
  ticket: TicketDoHistorico | null,
  eventos: EventoHistorico[] = [],
) {
  return {
    registrar: jest.fn(),
    buscarTicket: jest.fn().mockResolvedValue(ticket),
    listarPorTicket: jest.fn().mockResolvedValue(eventos),
  } satisfies HistoricoRepository;
}

// Helper: monta o caso de uso e dispara a consulta ao ticket 7.
function listar(
  ticket: TicketDoHistorico | null,
  eventos: EventoHistorico[],
  usuarioId: number,
  perfil: PerfilLiteral,
): Promise<EventoHistorico[]> {
  return new ListarHistoricoUseCase(makeRepo(ticket, eventos)).executar(
    7,
    usuarioId,
    perfil,
  );
}

describe('ListarHistoricoUseCase', () => {
  it('404 quando o chamado não existe', async () => {
    await expect(listar(null, [], 1, 'ADMIN')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('ADMIN vê todos os eventos em ordem cronológica', async () => {
    const eventos = [
      evt({ id: 1, type: 'CLASSIFICACAO_IA' }),
      evt({ id: 2, type: 'MUDANCA_STATUS', authorId: 42 }),
    ];
    const out = await listar({ id: 7, assigneeId: 42 }, eventos, 1, 'ADMIN');
    expect(out.map((e) => e.id)).toEqual([1, 2]);
  });

  it('403 quando funcionário não é o atribuído (anti-IDOR)', async () => {
    await expect(
      listar({ id: 7, assigneeId: 99 }, [], 42, 'FUNCIONARIO'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('funcionário atribuído vê visão restrita (IA + próprias reclassificações)', async () => {
    const eventos = [
      evt({ id: 1, type: 'CLASSIFICACAO_IA' }),
      evt({ id: 2, type: 'RECLASSIFICACAO', authorId: 42 }),
      evt({ id: 3, type: 'MUDANCA_STATUS', authorId: 42 }),
    ];
    const out = await listar(
      { id: 7, assigneeId: 42 },
      eventos,
      42,
      'FUNCIONARIO',
    );
    expect(out.map((e) => e.id)).toEqual([1, 2]);
  });
});
