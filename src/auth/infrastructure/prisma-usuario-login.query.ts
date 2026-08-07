import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredencialUsuario, UsuarioLoginQuery } from '../application/ports';

@Injectable()
export class PrismaUsuarioLoginQuery implements UsuarioLoginQuery {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorEmail(email: string): Promise<CredencialUsuario | null> {
    const u = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, senhaHash: true, perfil: true },
    });
    return u; // enum Perfil do Prisma == união do domínio (mesmos literais)
  }
}
