import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HistoricoModule } from '../historico/historico.module';
import { ChamadoController } from './chamado.controller';
import { AbrirChamadoUseCase } from './application/abrir-chamado.usecase';
import { MudarStatusUseCase } from './application/mudar-status.usecase';
import { ListarMeusChamadosUseCase } from './application/listar-meus-chamados.usecase';
import { PrismaChamadoRepository } from './infrastructure/prisma-chamado.repository';
import { CHAMADO_REPOSITORY } from './application/ports';

// AuthModule fornece PerfilGuard (TASK-02); HistoricoModule exporta a porta de
// gravação (RegistrarEventoUseCase) para MudarStatus registrar MUDANCA_STATUS.
@Module({
  imports: [AuthModule, HistoricoModule],
  controllers: [ChamadoController],
  providers: [
    AbrirChamadoUseCase,
    MudarStatusUseCase,
    ListarMeusChamadosUseCase,
    { provide: CHAMADO_REPOSITORY, useClass: PrismaChamadoRepository },
  ],
})
export class ChamadoModule {}
