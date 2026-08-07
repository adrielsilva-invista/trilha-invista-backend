import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfilGuard } from './perfil.guard';
import { Perfil } from '../domain/perfil';
import { TokenVerifier } from '../application/ports';

function contexto(authHeader?: string): ExecutionContext {
  const req = {
    headers: { authorization: authHeader } as Record<
      string,
      string | undefined
    >,
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function montar(opts: {
  perfisExigidos: Perfil[] | undefined;
  payload?: { sub: number; perfil: Perfil };
  verifyThrows?: boolean;
}) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(opts.perfisExigidos),
  } as unknown as Reflector;
  const tokens: TokenVerifier = {
    verify: jest.fn(() => {
      if (opts.verifyThrows) throw new Error('bad token');
      return opts.payload!;
    }),
  };
  return new PerfilGuard(reflector, tokens);
}

describe('PerfilGuard', () => {
  it('perfil do token na lista exigida → deixa passar', () => {
    const g = montar({
      perfisExigidos: ['ADMIN'],
      payload: { sub: 1, perfil: 'ADMIN' },
    });
    expect(g.canActivate(contexto('Bearer tok'))).toBe(true);
  });

  it('perfil fora da lista → 403', () => {
    const g = montar({
      perfisExigidos: ['ADMIN'],
      payload: { sub: 1, perfil: 'CLIENTE' },
    });
    expect(() => g.canActivate(contexto('Bearer tok'))).toThrow(
      ForbiddenException,
    );
  });

  it('rota protegida sem token → 401', () => {
    const g = montar({ perfisExigidos: ['ADMIN'] });
    expect(() => g.canActivate(contexto(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('token inválido → 401', () => {
    const g = montar({ perfisExigidos: ['ADMIN'], verifyThrows: true });
    expect(() => g.canActivate(contexto('Bearer lixo'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rota não anotada (metadata undefined) → pública, passa sem token', () => {
    const g = montar({ perfisExigidos: undefined });
    expect(g.canActivate(contexto(undefined))).toBe(true);
  });
});
