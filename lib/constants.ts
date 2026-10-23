export const ORDER_STATUS = {
  draft: 'Rascunho',
  pending_confirmation: 'Pendente de confirmação',
  confirmed: 'Confirmado',
  in_production: 'Em produção',
  ready: 'Pronto para entrega/retirada',
  completed: 'Entregue / Concluído',
  cancelled: 'Cancelado',
  // Legado para compatibilidade
  scheduled: 'Confirmado (Agendado)'
} as const

export const PAYMENT_STATUS = {
  unpaid: 'Não pago',
  partial: 'Parcial',
  paid: 'Pago',
  overpaid: 'Pago a mais'
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
  { value: 'pending_confirmation', label: 'Pendente de confirmação' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_production', label: 'Em produção' },
  { value: 'ready', label: 'Pronto p/ entrega ou retirada' },
  { value: 'completed', label: 'Entregue / Concluído' },
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

export const DELIVERY_TYPE_OPTIONS = [
  { value: 'pickup', label: 'Retirada no local' },
  { value: 'delivery', label: 'Entrega no endereço' }
]

export const PRODUCT_CATEGORIES = [
  { value: 'bolos', label: 'Bolos decorados & tortas' },
  { value: 'docinhos', label: 'Docinhos & brigadeiros' },
  { value: 'kits', label: 'Kits festa & combos' },
  { value: 'salgados', label: 'Salgados' },
  { value: 'sobremesas', label: 'Sobremesas & fatias' },
  { value: 'lembrancinhas', label: 'Lembrancinhas' },
  { value: 'outros', label: 'Outros' }
]

export const PRODUCT_UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'cento', label: 'Cento (100 un)' },
  { value: 'kg', label: 'Quilo (kg)' },
  { value: 'kit', label: 'Kit' },
  { value: 'fatia', label: 'Fatia' },
  { value: 'caixa', label: 'Caixa' }
]

export const EXPENSE_CATEGORIES = [
  { value: 'insumos', label: 'Insumos & Ingredientes' },
  { value: 'embalagens', label: 'Embalagens & Descartáveis' },
  { value: 'utilidades', label: 'Gás, Energia & Água' },
  { value: 'transporte', label: 'Transporte & Entregas' },
  { value: 'equipamentos', label: 'Utensílios & Equipamentos' },
  { value: 'marketing', label: 'Divulgação & Marketing' },
  { value: 'pro_labore', label: 'Retirada / Pró-labore' },
  { value: 'outros', label: 'Outros' }
]
