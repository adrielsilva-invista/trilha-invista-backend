import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CargaFuncionario } from '../domain/atribuicao';
import type {
  ClassificacaoStore,
  ResultadoClassificacao,
  TicketParaClassificar,
} from '../application/ports';

@Injectable()
export class PrismaClassificacaoStore implements ClassificacaoStore {
  constructor(private readonly prisma: PrismaService) {}

  buscar(ticketId: number): Promise<TicketParaClassificar | null> {
    return this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
      select: { id: true, status: true, body: true },
    });
  }

  // Grava original_* (imutável, da IA) e final_* (default = original; funcionário edita
  // depois, RF-05). NÃO transita: a abertura acontece em atribuirEAbrir, após a atribuição.
  async salvarClassificacao(
    ticketId: number,
    r: ResultadoClassificacao,
  ): Promise<void> {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        originalCategory: r.categoria,
        originalPriority: r.prioridade,
        originalArea: r.area,
        originalSentiment: r.sentimento,
        finalCategory: r.categoria,
        finalPriority: r.prioridade,
        finalArea: r.area,
        finalSentiment: r.sentimento,
        summary: r.resumo,
        aiModel: r.modelo,
        aiVersion: r.versao,
      },
    });
  }

  // Carga por funcionário (RF-07): todo FUNCIONARIO ativo + nº de tickets atribuídos
  // com status ∉ {RESOLVED, CANCELLED}. groupBy não devolve quem tem 0 → default 0.
  async cargasDosFuncionarios(): Promise<CargaFuncionario[]> {
    const funcs = await this.prisma.user.findMany({
      where: { perfil: 'FUNCIONARIO', deletedAt: null },
      select: { id: true },
    });
    if (funcs.length === 0) return [];

    const grupos = await this.prisma.ticket.groupBy({
      by: ['assigneeId'],
      where: {
        assigneeId: { in: funcs.map((f) => f.id) },
        status: { notIn: ['RESOLVED', 'CANCELLED'] },
        deletedAt: null,
      },
      _count: { _all: true },
    });
    const ativosPor = new Map(grupos.map((g) => [g.assigneeId, g._count._all]));
    return funcs.map((f) => ({
      funcionarioId: f.id,
      ativos: ativosPor.get(f.id) ?? 0,
    }));
  }

  // Seta o assignee (se houver) e faz a transição AWAITING_CLASSIFICATION → OPEN (RF-04).
  async atribuirEAbrir(
    ticketId: number,
    assigneeId: number | null,
  ): Promise<void> {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'OPEN', ...(assigneeId !== null ? { assigneeId } : {}) },
    });
  }

  // Falha da IA (RF-05): marca needsManualClassification e atribui (se houver).
  // NÃO seta status: o ticket permanece AWAITING_CLASSIFICATION p/ classificação manual.
  async marcarFalhaEAtribuir(
    ticketId: number,
    assigneeId: number | null,
  ): Promise<void> {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        needsManualClassification: true,
        ...(assigneeId !== null ? { assigneeId } : {}),
      },
    });
  }
}
