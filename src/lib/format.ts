/** Formatea coste en USD para mostrar en UI */
export function formatCostUsd(usd: number): string {
  if (usd < 0.001) return `~$${usd.toFixed(6)}`;
  if (usd < 0.01) return `~$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
