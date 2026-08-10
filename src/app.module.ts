import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { ChamadoModule } from './chamado/chamado.module';

@Module({
  imports: [PrismaModule, AuthModule, UsuarioModule, ChamadoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
