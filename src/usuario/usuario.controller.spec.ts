import { UsuarioController } from './usuario.controller';
import { CriarUsuarioUseCase } from './application/criar-usuario.usecase';
import { UsuarioCriado } from './application/ports';

describe('UsuarioController', () => {
  it('delega ao CriarUsuarioUseCase e devolve o resultado', async () => {
    const criado: UsuarioCriado = { id: 1, email: 'a@x.com', perfil: 'ADMIN' };
    const executar = jest.fn().mockResolvedValue(criado);
    const uc = { executar } as unknown as CriarUsuarioUseCase;
    const controller = new UsuarioController(uc);

    const dto = {
      email: 'a@x.com',
      senha: 'senha-longa',
      perfil: 'ADMIN' as const,
    };
    const out = await controller.criarUsuario(dto);

    expect(out).toBe(criado);
    expect(executar).toHaveBeenCalledWith(dto);
  });
});
