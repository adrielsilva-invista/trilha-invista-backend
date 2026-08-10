import { ConflictException } from '@nestjs/common';
import { CriarUsuarioUseCase } from './criar-usuario.usecase';
import { UsuarioRepository, UsuarioCriado } from './ports';
import { PasswordHasher } from '../../auth/application/ports';

function montar(opts?: { criarRejeitaCom?: unknown }) {
  // spies como refs soltas: asseverar sobre elas evita o falso-positivo
  // unbound-method do @typescript-eslint em mocks (padrão de login.usecase.spec).
  const hash = jest.fn().mockResolvedValue('hash-bcrypt');
  const criado: UsuarioCriado = { id: 42, email: 'a@x.com', perfil: 'CLIENTE' };
  const criar = opts?.criarRejeitaCom
    ? jest.fn().mockRejectedValue(opts.criarRejeitaCom)
    : jest.fn().mockResolvedValue(criado);
  const hasher: PasswordHasher = { hash, compare: jest.fn() };
  const usuarios: UsuarioRepository = { criar };
  return { uc: new CriarUsuarioUseCase(usuarios, hasher), hash, criar, criado };
}

describe('CriarUsuarioUseCase', () => {
  it('cria usuário: hasheia a senha e persiste o hash (nunca a senha clara)', async () => {
    const { uc, hash, criar, criado } = montar();

    const out = await uc.executar({
      email: 'a@x.com',
      senha: 'senha-secreta',
      perfil: 'CLIENTE',
    });

    expect(out).toEqual(criado);
    expect(hash).toHaveBeenCalledWith('senha-secreta');
    expect(criar).toHaveBeenCalledWith({
      email: 'a@x.com',
      passwordHash: 'hash-bcrypt',
      perfil: 'CLIENTE',
    });
  });

  it('não expõe passwordHash na saída (UsuarioCriado não tem o campo)', async () => {
    const { uc } = montar();
    const out = await uc.executar({
      email: 'a@x.com',
      senha: 'senha-secreta',
      perfil: 'ADMIN',
    });
    expect(out).not.toHaveProperty('passwordHash');
  });

  it('email duplicado: propaga o ConflictException da infra (409)', async () => {
    const { uc } = montar({
      criarRejeitaCom: new ConflictException('Email já cadastrado'),
    });

    await expect(
      uc.executar({
        email: 'dup@x.com',
        senha: 'senha-secreta',
        perfil: 'CLIENTE',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
