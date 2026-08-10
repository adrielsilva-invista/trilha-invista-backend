import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsuarioController } from './usuario.controller';
import { CriarUsuarioUseCase } from './application/criar-usuario.usecase';
import { PrismaUsuarioRepository } from './infrastructure/prisma-usuario.repository';
import { USUARIO_REPOSITORY } from './application/ports';

// AuthModule fornece PerfilGuard (via TOKEN_VERIFIER) e PASSWORD_HASHER (reuso TASK-02).
@Module({
  imports: [AuthModule],
  controllers: [UsuarioController],
  providers: [
    CriarUsuarioUseCase,
    { provide: USUARIO_REPOSITORY, useClass: PrismaUsuarioRepository },
  ],
})
export class UsuarioModule {}
