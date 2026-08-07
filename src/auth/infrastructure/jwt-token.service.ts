import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Perfil } from '../domain/perfil';
import { TokenSigner, TokenVerifier } from '../application/ports';

type Payload = { sub: number; perfil: Perfil };

@Injectable()
export class JwtTokenService implements TokenSigner, TokenVerifier {
  // Segredo via env — nunca hardcoded. Falha cedo no boot se ausente.
  private readonly secret = requireSecret();

  sign(payload: Payload): string {
    return jwt.sign(payload, this.secret, { expiresIn: '1h' });
  }

  verify(token: string): Payload {
    const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload;
    return { sub: Number(decoded.sub), perfil: decoded.perfil as Perfil };
  }
}

function requireSecret(): string {
  const s = process.env.JWT_SECRET;
  // Misconfiguração de deploy, não erro de request: falha o boot com exceção específica.
  if (!s) throw new InternalServerErrorException('JWT_SECRET não configurado');
  return s;
}
