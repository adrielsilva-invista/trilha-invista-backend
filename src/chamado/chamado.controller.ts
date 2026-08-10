import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { PerfilGuard } from '../auth/guards/perfil.guard';
import { Perfis } from '../auth/guards/perfis.decorator';
import { AbrirChamadoUseCase } from './application/abrir-chamado.usecase';
import { ChamadoCriado } from './application/ports';

class AbrirChamadoDto {
  // Trim antes de validar: " " vira "" e falha o Length(1) → 400. Trust boundary.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 5000)
  body!: string;
}

// PerfilGuard põe req.user = { sub, perfil }; o autor vem daí, nunca do body.
type ReqComUsuario = { user: { sub: number } };

@Controller('chamados')
export class ChamadoController {
  constructor(private readonly abrir: AbrirChamadoUseCase) {}

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
}
