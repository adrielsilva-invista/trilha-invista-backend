import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Perfil, perfilAutorizado } from '../domain/perfil';
import { PERFIS_KEY } from './perfis.decorator';
import type { TokenVerifier } from '../application/ports';
import { TOKEN_VERIFIER } from '../application/ports';

// Humble object: extrai token, delega a decisão RBAC ao domínio (perfilAutorizado).
// Sem @Perfis na rota → pública. Com @Perfis → exige token válido; perfil fora → 403.
@Injectable()
export class PerfilGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const perfisExigidos = this.reflector.getAllAndOverride<
      Perfil[] | undefined
    >(PERFIS_KEY, [context.getHandler(), context.getClass()]);
    if (perfisExigidos === undefined) return true; // rota não anotada = pública

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { sub: number; perfil: Perfil };
    }>();

    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token ausente');
    }

    let payload: { sub: number; perfil: Perfil };
    try {
      payload = this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    if (!perfilAutorizado(payload.perfil, perfisExigidos)) {
      throw new ForbiddenException('Perfil sem permissão');
    }
    req.user = payload; // downstream (controllers) leem o cliente/perfil daqui
    return true;
  }
}
