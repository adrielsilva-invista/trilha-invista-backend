import { ehTransitorio } from './politica-retry';
import { ResultadoInvalidoError } from './validar-resultado';

describe('ehTransitorio', () => {
  it('valor fora do enum (ResultadoInvalidoError) é transitório', () => {
    expect(ehTransitorio(new ResultadoInvalidoError('fora do enum'))).toBe(
      true,
    );
  });

  it('sem status (timeout / conexão) é transitório', () => {
    expect(ehTransitorio(new Error('timeout'))).toBe(true);
    expect(ehTransitorio({})).toBe(true);
  });

  it('429 e 5xx são transitórios', () => {
    expect(ehTransitorio({ status: 429 })).toBe(true);
    expect(ehTransitorio({ status: 500 })).toBe(true);
    expect(ehTransitorio({ status: 503 })).toBe(true);
  });

  it('401/403 e demais 4xx são definitivos', () => {
    expect(ehTransitorio({ status: 401 })).toBe(false);
    expect(ehTransitorio({ status: 403 })).toBe(false);
    expect(ehTransitorio({ status: 400 })).toBe(false);
  });

  it('null/undefined não quebram (transitório por segurança)', () => {
    expect(ehTransitorio(null)).toBe(true);
    expect(ehTransitorio(undefined)).toBe(true);
  });
});
