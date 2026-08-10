import { Perfil } from '../../auth/domain/perfil';

// Dados de entrada do caso de uso (senha ainda em claro; o use case hasheia).
export interface NovoUsuario {
  email: string;
  senha: string;
  perfil: Perfil;
}

// Saída: sem passwordHash — senha nunca sai do backend (RF-02, critério de aceite).
export interface UsuarioCriado {
  id: number;
  email: string;
  perfil: Perfil;
}

// O repositório recebe o hash já pronto — hashear é responsabilidade do use case.
export interface UsuarioRepository {
  criar(dados: {
    email: string;
    passwordHash: string;
    perfil: Perfil;
  }): Promise<UsuarioCriado>;
}

export const USUARIO_REPOSITORY = 'USUARIO_REPOSITORY';
