import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ChamadoCriado,
  ChamadoEstado,
  ChamadoResumo,
  ChamadoRepository,
} from '../application/ports';
import type { NovoChamado } from '../domain/chamado';

// Campos públicos do chamado — reusado por criar() e atualizarStatus().
const PUBLICO = {
  id: true,
  body: true,
  status: true,
  authorId: true,
  createdAt: true,
} as const;

@Injectable()
export class PrismaChamadoRepository implements ChamadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(chamado: NovoChamado): Promise<ChamadoCriado> {
    return this.prisma.ticket.create({ data: chamado, select: PUBLICO });
  }

  // Ignora soft-deleted: chamado apagado não existe para a máquina de estados.
  buscarPorId(id: number): Promise<ChamadoEstado | null> {
    return this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, assigneeId: true },
    });
  }

  atualizarStatus(
    id: number,
    status: NovoChamado['status'],
  ): Promise<ChamadoCriado> {
    return this.prisma.ticket.update({
      where: { id },
      data: { status },
      select: PUBLICO,
    });
  }

  // where authorId fecha o IDOR no banco; deletedAt: null esconde soft-deleted.
  listarPorAutor(autorId: number): Promise<ChamadoResumo[]> {
    return this.prisma.ticket.findMany({
      where: { authorId: autorId, deletedAt: null },
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
