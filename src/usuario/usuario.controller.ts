import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { PerfilGuard } from '../auth/guards/perfil.guard';
import { Perfis } from '../auth/guards/perfis.decorator';
import type { Perfil } from '../auth/domain/perfil';
import { CriarUsuarioUseCase } from './application/criar-usuario.usecase';
import { UsuarioCriado } from './application/ports';

const PERFIS: readonly Perfil[] = ['CLIENTE', 'FUNCIONARIO', 'ADMIN'];

class CriarUsuarioDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8) // senha mínima: trust boundary, validado na borda.
  senha!: string;

  @IsIn(PERFIS)
  perfil!: Perfil;
}

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly criar: CriarUsuarioUseCase) {}

  // Só ADMIN cria usuário (RF-02). Sem token → 401; perfil errado → 403 (PerfilGuard).
  @Post()
  @HttpCode(201)
  @UseGuards(PerfilGuard)
  @Perfis('ADMIN')
  criarUsuario(@Body() dto: CriarUsuarioDto): Promise<UsuarioCriado> {
    return this.criar.executar(dto);
  }
}
