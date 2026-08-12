import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HistoricoController } from './historico.controller';
import { ListarHistoricoUseCase } from './application/listar-historico.usecase';
import { RegistrarEventoUseCase } from './application/registrar-evento.usecase';
import { PrismaHistoricoRepository } from './infrastructure/prisma-historico.repository';
import { HISTORICO_REPOSITORY } from './application/ports';

// Exporta RegistrarEventoUseCase: porta única de gravação que ChamadoModule reusa.
@Module({
  imports: [AuthModule],
  controllers: [HistoricoController],
  providers: [
    ListarHistoricoUseCase,
    RegistrarEventoUseCase,
    { provide: HISTORICO_REPOSITORY, useClass: PrismaHistoricoRepository },
  ],
  exports: [RegistrarEventoUseCase],
})
export class HistoricoModule {}
