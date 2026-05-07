export const ORDER_STATUS = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  completed: 'Concluído',
  cancelled: 'Cancelado'
} as const

export const PAYMENT_STATUS = {
  unpaid: 'Não pago',
  partial: 'Parcial',
  paid: 'Pago',
  overpaid: 'Pago a mais' // As requested: overpaid = Pago a mais
} as const

export const PAYMENT_METHODS = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  bank_transfer: 'Transferência'
} as const

export const ORDER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' }
]

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Não pago' },
  { value: 'partial', label: 'Parcial' },
  { value: 'paid', label: 'Pago' },
  { value: 'overpaid', label: 'Pago a mais' }
]

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'bank_transfer', label: 'Transferência' }
]
