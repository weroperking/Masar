export function toMinorUnits(amount: number): number {
  if (isNaN(amount)) return 0;
  return Math.round(amount * 100);
}

export function toMajorUnits(amount: number): number {
  if (isNaN(amount)) return 0;
  return amount / 100;
}
