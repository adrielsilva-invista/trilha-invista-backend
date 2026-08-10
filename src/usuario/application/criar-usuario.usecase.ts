import { Injectable, Inject } from '@nestjs/common';
import type { PasswordHasher } from '../../auth/application/ports';
import { PASSWORD_HASHER } from '../../auth/application/ports';
import type { NovoUsuario, UsuarioCriado, UsuarioRepository } from './ports';
import { USUARIO_REPOSITORY } from './ports';

@Injectable()
export class CriarUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async executar(dados: NovoUsuario): Promise<UsuarioCriado> {
    const passwordHash = await this.hasher.hash(dados.senha);
    // Email duplicado vira 409 na infra (constraint do banco), não aqui: evita
    // race entre checar-e-inserir. O use case só propaga.
    return this.usuarios.criar({
      email: dados.email,
      passwordHash,
      perfil: dados.perfil,
    });
  }
}
