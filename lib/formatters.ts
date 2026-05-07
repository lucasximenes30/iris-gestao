export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  const number = parseFloat(cleaned)
  return isNaN(number) ? 0 : number
}
