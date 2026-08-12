import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

  // Classificar é o gatilho AWAITING_CLASSIFICATION → OPEN (RF-04). Grava original_*
  // (imutável, da IA) e final_* (default = original; funcionário edita depois, RF-05).
  async salvarClassificacao(
    ticketId: number,
    r: ResultadoClassificacao,
  ): Promise<void> {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'OPEN',
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
}
