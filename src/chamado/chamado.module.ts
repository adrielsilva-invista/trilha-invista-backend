import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChamadoController } from './chamado.controller';
import { AbrirChamadoUseCase } from './application/abrir-chamado.usecase';
import { PrismaChamadoRepository } from './infrastructure/prisma-chamado.repository';
import { CHAMADO_REPOSITORY } from './application/ports';

// AuthModule fornece PerfilGuard (via TOKEN_VERIFIER) — reuso TASK-02.
@Module({
  imports: [AuthModule],
  controllers: [ChamadoController],
  providers: [
    AbrirChamadoUseCase,
    { provide: CHAMADO_REPOSITORY, useClass: PrismaChamadoRepository },
  ],
})
export class ChamadoModule {}
