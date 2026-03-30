export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

export function compactFormat(num: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact' }).format(num)
}

export function standardFormat(num: number): string {
  return new Intl.NumberFormat().format(num)
}
