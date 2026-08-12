import { Injectable, Inject } from '@nestjs/common';
import { abrirChamado } from '../domain/chamado';
import type { ChamadoCriado, ChamadoRepository } from './ports';
import { CHAMADO_REPOSITORY } from './ports';
import type { FilaClassificacao } from '../../classificacao/application/ports';
import { FILA_CLASSIFICACAO } from '../../classificacao/application/ports';

@Injectable()
export class AbrirChamadoUseCase {
  constructor(
    @Inject(CHAMADO_REPOSITORY) private readonly chamados: ChamadoRepository,
    @Inject(FILA_CLASSIFICACAO) private readonly fila: FilaClassificacao,
  ) {}

  // authorId vem do token (req.user.sub), não do body — anti-forja.
  async executar(body: string, authorId: number): Promise<ChamadoCriado> {
    const chamado = await this.chamados.criar(abrirChamado(body, authorId));
    // Enfileira a classificação e retorna sem esperar o worker (RF-06).
    await this.fila.enfileirar(chamado.id);
    return chamado;
  }
}
