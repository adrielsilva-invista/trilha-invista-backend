// Perfil como união de strings (não enum do Prisma): o domain é puro, zero import
// de @prisma/@nestjs (D-03). Os valores batem 1:1 com o enum Perfil do schema.prisma;
// a infra faz a ponte DB↔domain (identidade, por ora).
// ponytail: se os enums divergirem, criar um mapeador explícito na infra. Upgrade quando
// o schema ganhar um perfil que o domínio não deva enxergar.
export type Perfil = 'CLIENTE' | 'FUNCIONARIO' | 'ADMIN';

/**
 * Autorização RBAC pura: o perfil do token satisfaz a lista exigida pela rota?
 * Lista vazia = rota exige só autenticação (qualquer perfil válido passa).
 */
export function perfilAutorizado(
  perfilDoToken: Perfil,
  perfisPermitidos: readonly Perfil[],
): boolean {
  return (
    perfisPermitidos.length === 0 || perfisPermitidos.includes(perfilDoToken)
  );
}
