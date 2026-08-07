import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { LoginUseCase } from './application/login.usecase';
import { PerfilGuard } from './guards/perfil.guard';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { PrismaUsuarioLoginQuery } from './infrastructure/prisma-usuario-login.query';
import {
  PASSWORD_HASHER,
  TOKEN_SIGNER,
  TOKEN_VERIFIER,
  USUARIO_LOGIN_QUERY,
} from './application/ports';

// Wiring: liga cada port (string token) à sua implementação de infra.
// JwtTokenService atende signer E verifier (mesma instância, mesmo segredo).
@Module({
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    PerfilGuard,
    JwtTokenService,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: USUARIO_LOGIN_QUERY, useClass: PrismaUsuarioLoginQuery },
    { provide: TOKEN_SIGNER, useExisting: JwtTokenService },
    { provide: TOKEN_VERIFIER, useExisting: JwtTokenService },
  ],
  exports: [PerfilGuard, TOKEN_VERIFIER],
})
export class AuthModule {}
