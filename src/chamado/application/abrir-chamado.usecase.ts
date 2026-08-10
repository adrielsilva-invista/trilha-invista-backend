import { Injectable, Inject } from '@nestjs/common';
import { abrirChamado } from '../domain/chamado';
import type { ChamadoCriado, ChamadoRepository } from './ports';
import { CHAMADO_REPOSITORY } from './ports';

@Injectable()
export class AbrirChamadoUseCase {
  constructor(
    @Inject(CHAMADO_REPOSITORY) private readonly chamados: ChamadoRepository,
  ) {}

  // authorId vem do token (req.user.sub), não do body — anti-forja.
  executar(body: string, authorId: number): Promise<ChamadoCriado> {
    return this.chamados.criar(abrirChamado(body, authorId));
  }
}
