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

// Sabores do Catálogo Iris Brigaderia / Confeitaria
export const CONFECTIONERY_FLAVORS = {
  convencionais: [
    'Amendoim',
    'Beijinho',
    'Brigadeiro',
    'Brigadeiro Branco com Jujuba',
    'Brigadeiro com Miçangas',
    'Brigadeiro de Palha Italiana',
    'Chocoball',
    'Churros',
    'Farinha Láctea',
    'Ninho',
    'Paçoquita',
    'Prestígio',
    'Tortinha de Limão',
    'Tortinha de Maracujá'
  ],
  especiais: [
    'Brigadeiro Oreo',
    'Dourado',
    'KitKat',
    'Miçangas Douradas',
    'Ferrero',
    'Cappuccino',
    'Casadinho',
    'Coco Queimado',
    'Crocante',
    'Goiabinha',
    'Ninho com Nutella',
    'Olho de Sogra',
    'Pérolas',
    'Surpresa de Uva',
    'Tortinha Doce de Leite',
    'Trufado'
  ],
  premium: [
    'Amêndoas',
    'Banana',
    'Belga',
    'Belga Branco',
    'Suspiro',
    'Brownie',
    'Creme Brûlée',
    'Damasco',
    'Uvinha Chique'
  ]
}

// Lista única combinada para autocompletes e sugestões rápidas
export const ALL_INITIAL_FLAVORS = Array.from(
  new Set([
    ...CONFECTIONERY_FLAVORS.convencionais,
    ...CONFECTIONERY_FLAVORS.especiais,
    ...CONFECTIONERY_FLAVORS.premium
  ])
).sort((a, b) => a.localeCompare('pt-BR'))

export interface ConfectioneryPreset {
  id: string
  name: string
  category: 'docinhos' | 'kits' | 'bolos' | 'outros'
  type: 'cento' | 'kit' | 'avulso'
  price: number
  unit: string
  minUnits?: number
  boxFeePerCento?: number
  badge?: string
  description: string
  flavorsGroup?: 'convencionais' | 'especiais' | 'premium'
}

export const CONFECTIONERY_PRESETS: ConfectioneryPreset[] = [
  {
    id: 'cento_convencional',
    name: 'Doces Convencionais (Cento)',
    category: 'docinhos',
    type: 'cento',
    price: 180,
    unit: 'cento',
    minUnits: 100,
    boxFeePerCento: 8,
    badge: 'R$ 180 / cento',
    description: 'Sabores tradicionais: Churros, Ninho, Brigadeiro, Beijinho, etc.',
    flavorsGroup: 'convencionais'
  },
  {
    id: 'cento_personalizado',
    name: 'Doces Personalizados (Cento)',
    category: 'docinhos',
    type: 'cento',
    price: 290,
    unit: 'cento',
    minUnits: 100,
    boxFeePerCento: 8,
    badge: 'R$ 290 / cento',
    description: 'Decorados e modelados no tema da festa (sabores convencionais)',
    flavorsGroup: 'convencionais'
  },
  {
    id: 'cento_especial',
    name: 'Doces Especiais (Cento)',
    category: 'docinhos',
    type: 'cento',
    price: 200,
    unit: 'cento',
    minUnits: 100,
    badge: 'R$ 200 / cento',
    description: 'Sabores especiais: Nutella, KitKat, Oreo, Ferrero, etc.',
    flavorsGroup: 'especiais'
  },
  {
    id: 'cento_premium',
    name: 'Doces Premium (Cento)',
    category: 'docinhos',
    type: 'cento',
    price: 300,
    unit: 'cento',
    minUnits: 100,
    badge: 'R$ 300 / cento',
    description: 'Sabores nobres: Belga, Brûlée, Brownie, Damasco, etc.',
    flavorsGroup: 'premium'
  },
  {
    id: 'kit_celebrar',
    name: 'Kit Celebrar',
    category: 'kits',
    type: 'kit',
    price: 410,
    unit: 'kit',
    badge: 'R$ 410',
    description: 'Bolo 15cm (15 fatias) + 50 doces convencionais'
  },
  {
    id: 'kit_festejar',
    name: 'Kit Festejar',
    category: 'kits',
    type: 'kit',
    price: 610,
    unit: 'kit',
    badge: 'R$ 610',
    description: 'Bolo 15cm + 100 doces convencionais + 25 personalizados'
  },
  {
    id: 'kit_comemorar',
    name: 'Kit Comemorar',
    category: 'kits',
    type: 'kit',
    price: 750,
    unit: 'kit',
    badge: 'R$ 750',
    description: 'Bolo 20cm (25 fatias) + 100 doces convencionais + 35 personalizados'
  },
  {
    id: 'kit_alegrar',
    name: 'Kit Alegrar',
    category: 'kits',
    type: 'kit',
    price: 910,
    unit: 'kit',
    badge: 'R$ 910',
    description: 'Bolo 25cm (35 fatias) + 150 doces convencionais + 50 personalizados'
  }
]
