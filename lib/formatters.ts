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
  // Datas puras (YYYY-MM-DD) não têm hora: exibe só a data, sem recuo de fuso
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return formatDate(dateString)
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date)
}

/**
 * Converte entradas monetárias para número. Aceita:
 * - formato brasileiro: "1.500,00", "R$ 150,50", "150,5"
 * - formato de <input type="number">: "150.50", "1500"
 */
export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  if (!value) return 0

  let cleaned = value.toString().replace(/[^\d,.-]/g, '')
  if (cleaned.includes(',')) {
    // Vírgula é o separador decimal; pontos são separadores de milhar
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if ((cleaned.match(/\./g) || []).length > 1) {
    // "1.500.000" sem vírgula: todos os pontos são de milhar
    cleaned = cleaned.replace(/\./g, '')
  }

  const number = parseFloat(cleaned)
  return isNaN(number) ? 0 : Math.round(number * 100) / 100
}

const APP_TIMEZONE = 'America/Sao_Paulo'

/** Data de hoje (YYYY-MM-DD) no fuso do Brasil — evita virar o dia após as 21h. */
export function getTodayISO(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Chave de mês (YYYY-MM) no fuso do Brasil, com deslocamento em meses (ex: -1 = mês passado). */
export function getMonthKey(offsetMonths = 0, date: Date = new Date()): string {
  const [y, m] = getTodayISO(date).split('-').map(Number)
  const shifted = new Date(Date.UTC(y, m - 1 + offsetMonths, 1))
  return shifted.toISOString().slice(0, 7)
}
