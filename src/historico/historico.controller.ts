import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PerfilGuard } from '../auth/guards/perfil.guard';
import { Perfis } from '../auth/guards/perfis.decorator';
import { ListarHistoricoUseCase } from './application/listar-historico.usecase';
import type { EventoHistorico } from './domain/evento';

// PerfilGuard põe req.user = { sub, perfil }; a visão restrita vem daí, não do body.
type PerfilLiteral = 'CLIENTE' | 'FUNCIONARIO' | 'ADMIN';
type ReqComUsuario = { user: { sub: number; perfil: PerfilLiteral } };

@Controller('chamados')
export class HistoricoController {
  constructor(private readonly listar: ListarHistoricoUseCase) {}

  // CLIENTE barrado no guard (RF-11). ADMIN vê tudo; FUNCIONARIO só o seu, restrito.
  @Get(':id/historico')
  @UseGuards(PerfilGuard)
  @Perfis('FUNCIONARIO', 'ADMIN')
  historico(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: ReqComUsuario,
  ): Promise<EventoHistorico[]> {
    return this.listar.executar(id, req.user.sub, req.user.perfil);
  }
}
