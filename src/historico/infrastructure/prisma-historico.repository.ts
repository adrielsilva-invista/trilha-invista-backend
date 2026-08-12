import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { EventoHistorico, NovoEvento } from '../domain/evento';
import type {
  HistoricoRepository,
  TicketDoHistorico,
} from '../application/ports';

// Sem update/delete: a ausência de caminho é o que garante a imutabilidade (RF-11).
@Injectable()
export class PrismaHistoricoRepository implements HistoricoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(evento: NovoEvento): Promise<void> {
    await this.prisma.ticketEvent.create({
      data: {
        ticketId: evento.ticketId,
        type: evento.type,
        payload: evento.payload as Prisma.InputJsonValue,
        authorId: evento.authorId,
      },
    });
  }

  // Ordem cronológica (RF-11). @@index([ticketId, createdAt]) cobre a query.
  listarPorTicket(ticketId: number): Promise<EventoHistorico[]> {
    return this.prisma.ticketEvent.findMany({
      where: { ticketId },
      select: {
        id: true,
        ticketId: true,
        type: true,
        payload: true,
        authorId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Ignora soft-deleted; só o necessário para autorizar (existência + atribuição).
  buscarTicket(ticketId: number): Promise<TicketDoHistorico | null> {
    return this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
      select: { id: true, assigneeId: true },
    });
  }
}
