import { podeTransitar, autorizadoATransicionar } from './transicoes';

describe('podeTransitar', () => {
  it('aceita o caminho feliz OPEN → IN_PROGRESS → RESOLVED', () => {
    expect(podeTransitar('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(podeTransitar('IN_PROGRESS', 'RESOLVED')).toBe(true);
  });

  it('aceita cancelar de qualquer estado não-final', () => {
    expect(podeTransitar('AWAITING_CLASSIFICATION', 'CANCELLED')).toBe(true);
    expect(podeTransitar('OPEN', 'CANCELLED')).toBe(true);
    expect(podeTransitar('IN_PROGRESS', 'CANCELLED')).toBe(true);
  });

  it('estados finais rejeitam qualquer transição', () => {
    expect(podeTransitar('RESOLVED', 'IN_PROGRESS')).toBe(false);
    expect(podeTransitar('RESOLVED', 'CANCELLED')).toBe(false);
    expect(podeTransitar('CANCELLED', 'OPEN')).toBe(false);
  });

  it('rejeita pulo de etapa e AWAITING → OPEN (Sprint-2)', () => {
    expect(podeTransitar('OPEN', 'RESOLVED')).toBe(false);
    expect(podeTransitar('AWAITING_CLASSIFICATION', 'OPEN')).toBe(false);
  });
});

describe('autorizadoATransicionar', () => {
  it('só ADMIN cancela', () => {
    expect(autorizadoATransicionar('ADMIN', 'CANCELLED', false)).toBe(true);
    expect(autorizadoATransicionar('FUNCIONARIO', 'CANCELLED', true)).toBe(
      false,
    );
    expect(autorizadoATransicionar('CLIENTE', 'CANCELLED', false)).toBe(false);
  });

  it('só FUNCIONARIO atribuído conduz', () => {
    expect(autorizadoATransicionar('FUNCIONARIO', 'IN_PROGRESS', true)).toBe(
      true,
    );
    expect(autorizadoATransicionar('FUNCIONARIO', 'RESOLVED', false)).toBe(
      false,
    ); // não atribuído
    expect(autorizadoATransicionar('ADMIN', 'IN_PROGRESS', true)).toBe(false); // admin não conduz
    expect(autorizadoATransicionar('CLIENTE', 'IN_PROGRESS', true)).toBe(false);
  });
});
