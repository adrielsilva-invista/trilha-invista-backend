import { UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './login.usecase';
import {
  PasswordHasher,
  TokenSigner,
  UsuarioLoginQuery,
  CredencialUsuario,
} from './ports';

const usuarioValido: CredencialUsuario = {
  id: 7,
  passwordHash: 'hash-guardado',
  perfil: 'ADMIN',
};

function montar(opts: {
  usuario: CredencialUsuario | null;
  senhaConfere: boolean;
}) {
  // spies como refs soltas: asseverar sobre elas (não sobre obj.method) evita
  // o falso-positivo unbound-method do @typescript-eslint em mocks.
  const buscarPorEmail = jest.fn().mockResolvedValue(opts.usuario);
  const compare = jest.fn().mockResolvedValue(opts.senhaConfere);
  const sign = jest.fn().mockReturnValue('jwt-fake');
  const usuarios: UsuarioLoginQuery = { buscarPorEmail };
  const hasher: PasswordHasher = { hash: jest.fn(), compare };
  const tokens: TokenSigner = { sign };
  return { uc: new LoginUseCase(usuarios, hasher, tokens), compare, sign };
}

describe('LoginUseCase', () => {
  it('credencial válida → retorna accessToken assinado com sub+perfil', async () => {
    const { uc, sign } = montar({
      usuario: usuarioValido,
      senhaConfere: true,
    });

    const out = await uc.executar('a@x.com', 'senha-certa');

    expect(out).toEqual({ accessToken: 'jwt-fake' });
    expect(sign).toHaveBeenCalledWith({ sub: 7, perfil: 'ADMIN' });
  });

  it('senha errada → 401 e não emite token', async () => {
    const { uc, sign } = montar({
      usuario: usuarioValido,
      senhaConfere: false,
    });

    await expect(uc.executar('a@x.com', 'errada')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sign).not.toHaveBeenCalled();
  });

  it('email inexistente → 401 (sem chamar o hasher com hash nulo)', async () => {
    const { uc, compare } = montar({ usuario: null, senhaConfere: true });

    await expect(uc.executar('nao@existe.com', 'x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(compare).not.toHaveBeenCalled();
  });
});
