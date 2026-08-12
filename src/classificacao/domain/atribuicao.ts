// Domínio puro: sem @nestjs, sem @prisma. Ver standards/clean-architecture.md.

// Carga de um funcionário = nº de tickets ativos (∉ {RESOLVED, CANCELLED}).
export interface CargaFuncionario {
  funcionarioId: number;
  ativos: number;
}

// RF-07: atribui ao de MENOR carga; empate → MENOR id (determinístico).
// null quando não há funcionário elegível (o caso de fallback é da TASK-12).
export function selecionarMenorCarga(
  cargas: CargaFuncionario[],
): number | null {
  let escolhido: CargaFuncionario | null = null;
  for (const c of cargas) {
    if (
      !escolhido ||
      c.ativos < escolhido.ativos ||
      (c.ativos === escolhido.ativos &&
        c.funcionarioId < escolhido.funcionarioId)
    ) {
      escolhido = c;
    }
  }
  return escolhido ? escolhido.funcionarioId : null;
}
