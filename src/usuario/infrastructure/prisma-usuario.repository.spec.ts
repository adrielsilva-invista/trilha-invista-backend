import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaUsuarioRepository } from './prisma-usuario.repository';
import { PrismaService } from '../../prisma/prisma.service';

function montar(createImpl: jest.Mock) {
  const prisma = { user: { create: createImpl } } as unknown as PrismaService;
  return new PrismaUsuarioRepository(prisma);
}

function erroP2002() {
  // Constrói o erro real do Prisma (unique violation) para exercitar o catch.
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'x',
  });
}

describe('PrismaUsuarioRepository', () => {
  const dados = {
    email: 'a@x.com',
    passwordHash: 'h',
    perfil: 'CLIENTE' as const,
  };

  it('cria e retorna id/email/perfil (sem passwordHash)', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 1, email: 'a@x.com', perfil: 'CLIENTE' });
    const repo = montar(create);

    const out = await repo.criar(dados);

    expect(out).toEqual({ id: 1, email: 'a@x.com', perfil: 'CLIENTE' });
    expect(create).toHaveBeenCalledWith({
      data: dados,
      select: { id: true, email: true, perfil: true },
    });
  });

  it('P2002 (email duplicado) → ConflictException (409)', async () => {
    const repo = montar(jest.fn().mockRejectedValue(erroP2002()));
    await expect(repo.criar(dados)).rejects.toBeInstanceOf(ConflictException);
  });

  it('erro desconhecido → propaga (não engole)', async () => {
    const boom = new Error('db down');
    const repo = montar(jest.fn().mockRejectedValue(boom));
    await expect(repo.criar(dados)).rejects.toBe(boom);
  });
});
