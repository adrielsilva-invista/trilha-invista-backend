import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ChamadoCriado, ChamadoRepository } from '../application/ports';
import type { NovoChamado } from '../domain/chamado';

@Injectable()
export class PrismaChamadoRepository implements ChamadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  criar(chamado: NovoChamado): Promise<ChamadoCriado> {
    return this.prisma.ticket.create({
      data: chamado,
      select: {
        id: true,
        body: true,
        status: true,
        authorId: true,
        createdAt: true,
      },
    });
  }
}
