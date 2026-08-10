import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UsuarioCriado, UsuarioRepository } from '../application/ports';
import { Perfil } from '../../auth/domain/perfil';

@Injectable()
export class PrismaUsuarioRepository implements UsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: {
    email: string;
    passwordHash: string;
    perfil: Perfil;
  }): Promise<UsuarioCriado> {
    try {
      const u = await this.prisma.user.create({
        data: dados,
        select: { id: true, email: true, perfil: true },
      });
      return u; // enum Perfil do Prisma == união do domínio (mesmos literais)
    } catch (e) {
      // P2002 = unique violation (email). Constraint do banco é a fonte da verdade.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email já cadastrado');
      }
      throw e;
    }
  }
}
