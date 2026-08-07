import { Perfil } from '../domain/perfil';

// Ports: a application depende destas abstrações; a infra as implementa (D-03).

export interface PasswordHasher {
  compare(senhaClara: string, senhaHash: string): Promise<boolean>;
}

export interface TokenSigner {
  sign(payload: { sub: number; perfil: Perfil }): string;
}

export interface TokenVerifier {
  verify(token: string): { sub: number; perfil: Perfil };
}

// Só o que o login precisa do usuário — não é o repositório completo (TASK-03).
export interface CredencialUsuario {
  id: number;
  senhaHash: string;
  perfil: Perfil;
}

export interface UsuarioLoginQuery {
  buscarPorEmail(email: string): Promise<CredencialUsuario | null>;
}

// Tokens de injeção Nest (interface não existe em runtime → string token).
export const PASSWORD_HASHER = 'PASSWORD_HASHER';
export const TOKEN_SIGNER = 'TOKEN_SIGNER';
export const TOKEN_VERIFIER = 'TOKEN_VERIFIER';
export const USUARIO_LOGIN_QUERY = 'USUARIO_LOGIN_QUERY';
