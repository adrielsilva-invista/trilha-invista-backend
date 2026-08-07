import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global: os módulos de domínio (Sprint-1+) injetam PrismaService sem re-importar.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
