export function toMinorUnits(userUnits: number): number {
  return Math.round(userUnits * 100)
}

export function toMajorUnits(minor: number): number {
  return minor / 100
}
