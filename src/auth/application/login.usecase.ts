import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import type { PasswordHasher, TokenSigner, UsuarioLoginQuery } from './ports';
import { PASSWORD_HASHER, TOKEN_SIGNER, USUARIO_LOGIN_QUERY } from './ports';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USUARIO_LOGIN_QUERY) private readonly usuarios: UsuarioLoginQuery,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SIGNER) private readonly tokens: TokenSigner,
  ) {}

  async executar(
    email: string,
    senha: string,
  ): Promise<{ accessToken: string }> {
    const usuario = await this.usuarios.buscarPorEmail(email);
    // Mesma resposta para "email não existe" e "senha errada": não vaza quais emails existem.
    if (!usuario || !(await this.hasher.compare(senha, usuario.senhaHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return {
      accessToken: this.tokens.sign({
        sub: usuario.id,
        perfil: usuario.perfil,
      }),
    };
  }
}
