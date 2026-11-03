export function playerColor(idx: number): string {
  return `var(--p${(idx % 5) + 1})`;
}
