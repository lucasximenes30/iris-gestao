export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'number' ? value : Number(value) || 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

/**
 * Formata data evitando o bug de fuso horário UTC em strings YYYY-MM-DD
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  // Se for YYYY-MM-DD puro (sem hora), formata direto para evitar o recuo de fuso (UTC-3)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

export function formatDateWithWeekday(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  let date: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number)
    // Constrói no horário local
    date = new Date(year, month - 1, day, 12, 0, 0)
  } else {
    date = new Date(dateString)
  }

  if (isNaN(date.getTime())) return ''
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date)
  const formatted = formatDate(dateString)
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${formatted}`
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date)
}

export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return value
  if (!value) return 0
  const cleaned = value.toString().replace(/[^\d,-]/g, '').replace(',', '.')
  const number = parseFloat(cleaned)
  return isNaN(number) ? 0 : number
}
