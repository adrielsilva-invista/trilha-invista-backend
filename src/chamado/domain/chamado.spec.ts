import { abrirChamado } from './chamado';

describe('abrirChamado', () => {
  it('nasce AWAITING_CLASSIFICATION (D-05: sem IA na Sprint-1)', () => {
    const c = abrirChamado('impressora não liga', 42);
    expect(c.status).toBe('AWAITING_CLASSIFICATION');
  });

  it('liga o chamado ao autor e preserva o texto', () => {
    const c = abrirChamado('texto do chamado', 7);
    expect(c).toEqual({
      body: 'texto do chamado',
      authorId: 7,
      status: 'AWAITING_CLASSIFICATION',
    });
  });
});
