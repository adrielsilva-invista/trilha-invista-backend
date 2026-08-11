import { Injectable, Inject } from '@nestjs/common';
import type { ChamadoResumo, ChamadoRepository } from './ports';
import { CHAMADO_REPOSITORY } from './ports';

@Injectable()
export class ListarMeusChamadosUseCase {
  constructor(
    @Inject(CHAMADO_REPOSITORY) private readonly chamados: ChamadoRepository,
  ) {}

  // autorId vem do token (req.user.sub), nunca de query param — anti-IDOR.
  executar(autorId: number): Promise<ChamadoResumo[]> {
    return this.chamados.listarPorAutor(autorId);
  }
}
