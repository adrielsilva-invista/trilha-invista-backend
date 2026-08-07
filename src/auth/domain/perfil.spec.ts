import { perfilAutorizado, Perfil } from './perfil';

describe('perfilAutorizado (RBAC puro)', () => {
  it('perfil na lista permitida → true', () => {
    expect(perfilAutorizado('ADMIN', ['ADMIN', 'FUNCIONARIO'])).toBe(true);
  });

  it('perfil fora da lista → false', () => {
    expect(perfilAutorizado('CLIENTE', ['ADMIN'])).toBe(false);
  });

  it('lista vazia (só autenticação) → qualquer perfil passa', () => {
    const perfis: Perfil[] = ['CLIENTE', 'FUNCIONARIO', 'ADMIN'];
    for (const p of perfis) expect(perfilAutorizado(p, [])).toBe(true);
  });
});
