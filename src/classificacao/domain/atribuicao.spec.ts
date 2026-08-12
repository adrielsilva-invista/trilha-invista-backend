import { selecionarMenorCarga } from './atribuicao';

describe('selecionarMenorCarga', () => {
  it('escolhe o de menor carga', () => {
    expect(
      selecionarMenorCarga([
        { funcionarioId: 1, ativos: 5 },
        { funcionarioId: 2, ativos: 2 },
        { funcionarioId: 3, ativos: 4 },
      ]),
    ).toBe(2);
  });

  it('desempata por menor id', () => {
    expect(
      selecionarMenorCarga([
        { funcionarioId: 7, ativos: 3 },
        { funcionarioId: 4, ativos: 3 },
        { funcionarioId: 9, ativos: 3 },
      ]),
    ).toBe(4);
  });

  it('devolve null sem funcionário', () => {
    expect(selecionarMenorCarga([])).toBeNull();
  });
});
