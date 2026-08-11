import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';
import { PerfilGuard } from '../auth/guards/perfil.guard';
import { Perfis } from '../auth/guards/perfis.decorator';
import { AbrirChamadoUseCase } from './application/abrir-chamado.usecase';
import { MudarStatusUseCase } from './application/mudar-status.usecase';
import { ListarMeusChamadosUseCase } from './application/listar-meus-chamados.usecase';
import { ChamadoCriado, ChamadoResumo } from './application/ports';
import type { TicketStatus } from './domain/chamado';

class AbrirChamadoDto {
  // Trim antes de validar: " " vira "" e falha o Length(1) → 400. Trust boundary.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 5000)
  body!: string;
}

// Alvos aceitos pela API. AWAITING_CLASSIFICATION/OPEN não são destinos manuais
// nesta sprint (OPEN é disparado pela classificação, RF-08/Sprint-2).
const STATUS_ALVO: TicketStatus[] = ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'];

class MudarStatusDto {
  @IsIn(STATUS_ALVO)
  status!: TicketStatus;
}

// PerfilGuard põe req.user = { sub, perfil }; o autor vem daí, nunca do body.
type PerfilLiteral = 'CLIENTE' | 'FUNCIONARIO' | 'ADMIN';
type ReqComUsuario = { user: { sub: number; perfil: PerfilLiteral } };

@Controller('chamados')
export class ChamadoController {
  constructor(
    private readonly abrir: AbrirChamadoUseCase,
    private readonly mudarStatus: MudarStatusUseCase,
    private readonly listarMeus: ListarMeusChamadosUseCase,
  ) {}

  // Lista só os chamados do próprio cliente. O filtro é req.user.sub — nunca
  // um id de query — então CLIENTE não forja acesso a chamado alheio (IDOR).
  @Get()
  @UseGuards(PerfilGuard)
  @Perfis('CLIENTE')
  listarMeusChamados(@Req() req: ReqComUsuario): Promise<ChamadoResumo[]> {
    return this.listarMeus.executar(req.user.sub);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(PerfilGuard)
  @Perfis('CLIENTE')
  abrirChamado(
    @Body() dto: AbrirChamadoDto,
    @Req() req: ReqComUsuario,
  ): Promise<ChamadoCriado> {
    return this.abrir.executar(dto.body, req.user.sub);
  }

  // Guard barra CLIENTE; a regra fina (quem transiciona pra quê) vive no domain.
  @Patch(':id/status')
  @UseGuards(PerfilGuard)
  @Perfis('FUNCIONARIO', 'ADMIN')
  transicionar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MudarStatusDto,
    @Req() req: ReqComUsuario,
  ): Promise<ChamadoCriado> {
    return this.mudarStatus.executar(
      id,
      dto.status,
      req.user.sub,
      req.user.perfil,
    );
  }
}
