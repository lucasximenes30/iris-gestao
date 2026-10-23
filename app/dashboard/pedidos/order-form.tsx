'use client'

import { useState, useId } from 'react'
import Link from 'next/link'
import { createOrderAction, updateOrderAction } from './actions'
import {
  ORDER_STATUS_OPTIONS,
  DELIVERY_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  CONFECTIONERY_PRESETS,
  type ConfectioneryPreset
} from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'
import FlavorComposer from './flavor-composer'
import type { Client } from '@/lib/db/clients'
import type { Product } from '@/lib/db/products'
import type { Order, OrderItem } from '@/lib/db/orders'

interface ExtendedOrderItem extends OrderItem {
  preset_id?: string
  has_boxes?: boolean
  target_units?: number
  flavor_category?: 'convencionais' | 'especiais' | 'premium' | 'all'
}

interface OrderFormProps {
  initialOrder?: (Order & { order_items?: OrderItem[] }) | null
  availableClients: Client[]
  availableProducts: Product[]
  defaultClientId?: string
}

function getQuickDate(type: 'today' | 'tomorrow' | 'saturday' | 'sunday'): string {
  const now = new Date()
  if (type === 'today') return now.toISOString().split('T')[0]
  if (type === 'tomorrow') {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  if (type === 'saturday' || type === 'sunday') {
    const d = new Date(now)
    const targetDay = type === 'saturday' ? 6 : 0
    const currentDay = d.getDay()
    let diff = targetDay - currentDay
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }
  return ''
}

export default function OrderForm({
  initialOrder,
  availableClients,
  availableProducts,
  defaultClientId
}: OrderFormProps) {
  const isEditing = !!initialOrder

  // 1. Cliente
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialOrder?.client_id || defaultClientId || ''
  )
  const [clientName, setClientName] = useState<string>(initialOrder?.client_name || '')
  const [clientPhone, setClientPhone] = useState<string>(initialOrder?.client_phone || '')
  const [clientEmail, setClientEmail] = useState<string>(initialOrder?.client_email || '')

  // 2. Logística & Datas
  const [eventDate, setEventDate] = useState<string>(initialOrder?.event_date || '')
  const [eventTime, setEventTime] = useState<string>(initialOrder?.event_time || '')
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>(
    (initialOrder?.delivery_type as 'pickup' | 'delivery') || 'pickup'
  )
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    initialOrder?.delivery_address || ''
  )
  const [eventLocation, setEventLocation] = useState<string>(
    initialOrder?.event_location || 'Ateliê / Retirada'
  )
  const [deliveryFee, setDeliveryFee] = useState<number>(initialOrder?.delivery_fee || 0)
  const [discountAmount, setDiscountAmount] = useState<number>(initialOrder?.discount_amount || 0)

  // 3. Itens do Pedido
  const [items, setItems] = useState<ExtendedOrderItem[]>(() => {
    if (initialOrder?.order_items && initialOrder.order_items.length > 0) {
      return initialOrder.order_items.map(it => {
        const isCento = it.name.toLowerCase().includes('cento') || it.name.toLowerCase().includes('doces')
        return {
          ...it,
          target_units: isCento ? 100 : undefined,
          flavor_category: it.name.toLowerCase().includes('especiais')
            ? 'especiais'
            : it.name.toLowerCase().includes('premium')
            ? 'premium'
            : 'convencionais'
        }
      })
    }
    return []
  })

  // 4. Sinal de 50% Automático
  const [registerInitialPayment, setRegisterInitialPayment] = useState<boolean>(false)
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<string>('pix')

  // 5. Configurações avançadas (recolhidas por padrão)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [title, setTitle] = useState<string>(initialOrder?.title || '')
  const [status, setStatus] = useState<string>(initialOrder?.status || 'confirmed')
  const [estimatedCost, setEstimatedCost] = useState<number | ''>(
    initialOrder?.estimated_cost !== null && initialOrder?.estimated_cost !== undefined
      ? initialOrder.estimated_cost
      : ''
  )
  const [notes, setNotes] = useState<string>(initialOrder?.notes || '')

  // 6. Estado de submissão
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selecionar cliente existente
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId)
    if (clientId) {
      const client = availableClients.find(c => c.id === clientId)
      if (client) {
        setClientName(client.name)
        if (client.phone) setClientPhone(client.phone)
        if (client.email) setClientEmail(client.email)
        if (client.address) setDeliveryAddress(client.address)
      }
    }
  }

  // Adicionar item a partir de Preset de Confeitaria (Catálogo Iris)
  const handleAddPreset = (preset: ConfectioneryPreset) => {
    const isCento = preset.type === 'cento'
    const newTarget = isCento ? (preset.minUnits || 100) : preset.type === 'kit' ? 50 : undefined

    setItems(prev => [
      ...prev,
      {
        preset_id: preset.id,
        name: preset.name,
        quantity: 1,
        unit_price: preset.price,
        total_price: preset.price,
        notes: '',
        has_boxes: false,
        target_units: newTarget,
        flavor_category: preset.flavorsGroup || 'convencionais'
      }
    ])
  }

  // Adicionar item a partir de produto cadastrado no banco
  const handleAddProduct = (productId: string) => {
    if (!productId) return
    const prod = availableProducts.find(p => p.id === productId)
    if (!prod) return

    const isCento = prod.unit === 'cento' || prod.name.toLowerCase().includes('cento')
    setItems(prev => [
      ...prev,
      {
        product_id: prod.id,
        name: prod.name,
        quantity: 1,
        unit_price: Number(prod.price) || 0,
        total_price: Number(prod.price) || 0,
        notes: '',
        target_units: isCento ? 100 : undefined,
        flavor_category: 'convencionais'
      }
    ])
  }

  // Adicionar item avulso/customizado
  const handleAddCustomItem = () => {
    setItems(prev => [
      ...prev,
      {
        name: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        notes: '',
        flavor_category: 'convencionais'
      }
    ])
  }

  // Atualizar campo de um item
  const handleItemChange = (index: number, field: keyof ExtendedOrderItem, value: any) => {
    setItems(prev => {
      const copy = [...prev]
      const current = { ...copy[index], [field]: value }

      // Se mudou quantidade ou preço unitário, recalcula total
      if (field === 'quantity' || field === 'unit_price' || field === 'has_boxes') {
        const q = Number(current.quantity) || 0
        let p = Number(current.unit_price) || 0

        // Se tem caixetas (R$ 8 por cento)
        const boxAddon = current.has_boxes ? 8 * q : 0
        current.total_price = Math.round((q * p + boxAddon) * 100) / 100

        // Se for cento, ajusta a meta proporcionalmente (ex: 2 centos = 200 doces)
        if (current.target_units && (current.preset_id?.startsWith('cento') || current.name.toLowerCase().includes('cento'))) {
          current.target_units = Math.round(q * 100)
        }
      }

      copy[index] = current
      return copy
    })
  }

  // Toggle de caixetas 4 pétalas (+ R$ 8 por cento)
  const handleToggleBoxes = (index: number) => {
    setItems(prev => {
      const copy = [...prev]
      const current = { ...copy[index] }
      const willHaveBoxes = !current.has_boxes
      current.has_boxes = willHaveBoxes

      const q = Number(current.quantity) || 1
      const basePrice = current.unit_price || 0
      const boxAddon = willHaveBoxes ? 8 * q : 0
      current.total_price = Math.round((q * basePrice + boxAddon) * 100) / 100

      copy[index] = current
      return copy
    })
  }

  // Remover item
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // Cálculos de totais
  const itemsSubtotal = items.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0)
  const [manualTotal, setManualTotal] = useState<number>(initialOrder?.total_amount || 0)

  const computedTotal = items.length > 0
    ? Math.max(0, itemsSubtotal + (Number(deliveryFee) || 0) - (Number(discountAmount) || 0))
    : manualTotal

  // Sinal sugerido de 50%
  const suggestedDownPayment = Math.round((computedTotal * 0.5) * 100) / 100

  // Submissão
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Formata os itens para envio
    const formattedItems: OrderItem[] = items.map(it => {
      let finalNotes = it.notes || ''
      if (it.has_boxes) {
        finalNotes = finalNotes ? `${finalNotes} | [Com caixetas 4 pétalas]` : '[Com caixetas 4 pétalas]'
      }
      return {
        product_id: it.product_id,
        name: it.name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price,
        notes: finalNotes || null
      }
    })

    const formData = new FormData()
    formData.set('client_name', clientName)
    if (clientPhone) formData.set('client_phone', clientPhone)
    if (clientEmail) formData.set('client_email', clientEmail)
    if (selectedClientId) formData.set('client_id', selectedClientId)

    // Se o usuário não digitou título, deixa vazio para a Server Action auto-gerar inteligentemente
    if (title.trim()) formData.set('title', title.trim())

    formData.set('items', JSON.stringify(formattedItems))
    formData.set('total_amount', computedTotal.toString())
    formData.set('delivery_type', deliveryType)
    formData.set('delivery_fee', deliveryFee.toString())
    formData.set('discount_amount', discountAmount.toString())

    if (deliveryType === 'delivery') {
      formData.set('delivery_address', deliveryAddress)
    } else {
      formData.set('event_location', eventLocation)
    }

    if (eventDate) formData.set('event_date', eventDate)
    if (eventTime) formData.set('event_time', eventTime)
    formData.set('status', status)
    if (estimatedCost !== '') formData.set('estimated_cost', estimatedCost.toString())
    if (notes) formData.set('notes', notes)

    // Sinal de 50% opcional imediato
    if (!isEditing && registerInitialPayment && suggestedDownPayment > 0) {
      formData.set('register_initial_payment', 'true')
      formData.set('initial_payment_amount', suggestedDownPayment.toString())
      formData.set('initial_payment_method', initialPaymentMethod)
    }

    let res
    if (isEditing && initialOrder?.id) {
      res = await updateOrderAction(initialOrder.id, formData)
    } else {
      res = await createOrderAction(formData)
    }

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-12">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* 1. DADOS DO CLIENTE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">👤</span>
            <h2 className="font-bold text-slate-800 text-sm">1. Cliente</h2>
          </div>
          {availableClients.length > 0 && (
            <span className="text-xs text-slate-400">
              {availableClients.length} salvos
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Seletor rápido de cliente existente */}
          {availableClients.length > 0 && (
            <div>
              <select
                id="select-client"
                value={selectedClientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/60 font-medium text-slate-700"
              >
                <option value="">-- Buscar cliente salvo ou digitar novo abaixo --</option>
                {availableClients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="client_name" className="block text-xs font-semibold text-slate-600 mb-1">
                Nome da cliente *
              </label>
              <input
                id="client_name"
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Mariana Silveira"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label htmlFor="client_phone" className="block text-xs font-semibold text-slate-600 mb-1">
                WhatsApp / Celular
              </label>
              <input
                id="client_phone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(85) 99876-5432"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. ITENS DA ENCOMENDA & SABORES (O CORAÇÃO DO SISTEMA) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🎂</span>
            <h2 className="font-bold text-slate-800 text-sm">2. Doces & Encomenda</h2>
          </div>
          {items.length > 0 && (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        {/* ATALHOS RÁPIDOS DO CATÁLOGO DE CONFEITARIA */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/50 to-white border-b border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            Toque rápido para adicionar do catálogo:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONFECTIONERY_PRESETS.filter(p => p.type === 'cento').map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleAddPreset(preset)}
                className="p-2.5 bg-white hover:bg-indigo-50/60 active:scale-97 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all shadow-2xs group flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 block line-clamp-1">
                    {preset.name.replace(' (Cento)', '')}
                  </span>
                  <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                    {preset.flavorsGroup === 'convencionais' ? 'Churros, Ninho, etc.' : preset.description}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-600">
                    {formatCurrency(preset.price)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    + Adicionar
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Kits & Outros Itens */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Kits & Outros:</span>
            {CONFECTIONERY_PRESETS.filter(p => p.type === 'kit').map(kit => (
              <button
                key={kit.id}
                type="button"
                onClick={() => handleAddPreset(kit)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
              >
                🎂 {kit.name} ({formatCurrency(kit.price)})
              </button>
            ))}

            {availableProducts.length > 0 && (
              <select
                onChange={(e) => {
                  handleAddProduct(e.target.value)
                  e.target.value = ''
                }}
                defaultValue=""
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer border-none"
              >
                <option value="" disabled>+ Do meu catálogo salvo...</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatCurrency(p.price)})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleAddCustomItem}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              + Item avulso
            </button>
          </div>
        </div>

        {/* LISTAGEM DOS ITENS ADICIONADOS */}
        <div className="p-4 sm:p-5">
          {items.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center">
              <span className="text-3xl block mb-2">🍬</span>
              <p className="text-sm text-slate-700 font-bold">Nenhum doce adicionado ainda</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Toque em um dos botões acima para adicionar um Cento de Doces Convencionais (R$ 180), Personalizados ou Kits com 1 toque.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => {
                const isCento = item.name.toLowerCase().includes('cento') || item.name.toLowerCase().includes('doces')

                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-3 relative shadow-2xs"
                  >
                    {/* Linha principal: Nome, Qtd, Preço, Subtotal */}
                    <div className="grid grid-cols-12 gap-2.5 items-start">
                      <div className="col-span-12 sm:col-span-6">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Item / Descrição *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="Ex: Doces Convencionais (Cento)"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Qtd ({isCento ? 'centos' : 'un'}) *
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Unitário (R$) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2 pt-6">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatCurrency(item.total_price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Remover item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* COMPOSITOR INTELIGENTE DE SABORES COM AUTOCOMPLETE */}
                    <FlavorComposer
                      value={item.notes || ''}
                      onChange={(notesStr) => handleItemChange(idx, 'notes', notesStr)}
                      targetQuantity={item.target_units || (isCento ? Math.round(Number(item.quantity || 1) * 100) : 0)}
                      flavorCategory={item.flavor_category || 'convencionais'}
                      label={`Sabores do(a) ${item.name || 'item'}`}
                    />

                    {/* OPÇÃO DE CAIXETAS 4 PÉTALAS (+ R$ 8 por cento) */}
                    {isCento && (
                      <div className="flex items-center justify-between pt-1 px-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!item.has_boxes}
                            onChange={() => handleToggleBoxes(idx)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            📦 Incluir caixetas 4 pétalas (+R$ 8,00 por cento)
                          </span>
                        </label>

                        {item.has_boxes && (
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            +{formatCurrency(8 * (Number(item.quantity) || 1))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Subtotal dos Produtos */}
              <div className="flex justify-between items-center pt-2 px-1 text-sm font-bold text-slate-700">
                <span>Subtotal dos doces & kits:</span>
                <span className="text-base text-indigo-600 font-extrabold">
                  {formatCurrency(itemsSubtotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. LOGÍSTICA & DATAS (ENTREGA OU RETIRADA) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <h2 className="font-bold text-slate-800 text-sm">3. Data, Horário & Envio</h2>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Seletor rápido de data com chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Data da encomenda / evento
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setEventDate(getQuickDate('today'))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  eventDate === getQuickDate('today')
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setEventDate(getQuickDate('tomorrow'))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  eventDate === getQuickDate('tomorrow')
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => setEventDate(getQuickDate('saturday'))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  eventDate === getQuickDate('saturday')
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Próx. Sábado
              </button>
              <button
                type="button"
                onClick={() => setEventDate(getQuickDate('sunday'))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  eventDate === getQuickDate('sunday')
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Próx. Domingo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="Horário combinado"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Toggle Entrega vs Retirada */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tipo de Envio
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`py-3 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-98 ${
                  deliveryType === 'pickup'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🏢</span>
                <span>Retirada no Ateliê</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`py-3 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-98 ${
                  deliveryType === 'delivery'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🛵</span>
                <span>Entrega no Endereço</span>
              </button>
            </div>
          </div>

          {deliveryType === 'delivery' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Endereço completo de entrega *
                </label>
                <input
                  type="text"
                  required={deliveryType === 'delivery'}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Rua, número, complemento, bairro"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Taxa de Entrega (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryFee || ''}
                    onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Ponto de retirada
              </label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Endereço do ateliê ou ponto de encontro"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. FECHAMENTO FINANCEIRO & SINAL DE 50% */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <h2 className="font-bold text-slate-800 text-sm">4. Valor Total & Sinal 50%</h2>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Desconto Opcional */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Desconto (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>
            </div>

            {/* Total Geral em Destaque */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Valor Total do Pedido
                </span>
                <span className="text-xs text-slate-400">
                  {items.length > 0 ? 'Calculado automaticamente' : 'Preencha os itens'}
                </span>
              </div>
              <span className="text-2xl font-black text-indigo-700">
                {formatCurrency(computedTotal)}
              </span>
            </div>
          </div>

          {/* FACILITADOR DE SINAL 50% (POLÍTICA DO CATÁLOGO IRIS BRIGADERIA) */}
          {!isEditing && computedTotal > 0 && (
            <div className="p-3.5 sm:p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    Sinal de 50% de confirmação: <strong className="text-sm">{formatCurrency(suggestedDownPayment)}</strong>
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Conforme o catálogo, a encomenda é confirmada com sinal de 50% e restante na entrega.
                  </span>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs select-none">
                  <input
                    type="checkbox"
                    checked={registerInitialPayment}
                    onChange={(e) => setRegisterInitialPayment(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                  />
                  <span className="text-xs font-bold text-emerald-800">
                    Já recebi o sinal de {formatCurrency(suggestedDownPayment)}
                  </span>
                </label>
              </div>

              {registerInitialPayment && (
                <div className="pt-2 border-t border-emerald-200/80 flex items-center gap-2 text-xs">
                  <span className="text-emerald-800 font-medium">Forma de recebimento do sinal:</span>
                  <select
                    value={initialPaymentMethod}
                    onChange={(e) => setInitialPaymentMethod(e.target.value)}
                    className="px-2.5 py-1 bg-white rounded-md border border-emerald-300 text-xs font-bold text-emerald-900 focus:outline-none"
                  >
                    {PAYMENT_METHOD_OPTIONS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. OPÇÕES AVANÇADAS / INTERNAS (RECOLHIDAS POR PADRÃO PARA POUPAR TEMPO NO CELULAR) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-5 py-3.5 bg-slate-50 flex items-center justify-between text-left hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <div>
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider block">
                Mais opções (Custo estimado, título, observações internas)
              </span>
              <span className="text-[11px] text-slate-400">
                {showAdvanced ? 'Toque para recolher' : 'Opcional — toque para ver campos secundários'}
              </span>
            </div>
          </div>
          <span className="text-slate-400 text-sm font-bold">
            {showAdvanced ? '▲' : '▼'}
          </span>
        </button>

        {showAdvanced && (
          <div className="p-4 sm:p-5 space-y-4 border-t border-slate-100 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Título / Nome do Pedido (auto-gerado se vazio)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Ex: ${clientName || 'Cliente'} — Doces Convencionais`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Status Operacional
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {ORDER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Custo Estimado de Insumos (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Observações Gerais da Encomenda
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Embalar em caixa de acetato com laço rosa, avisar no WhatsApp quando estiver pronto..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* BARRA FIXA / FLUTUANTE DE AÇÃO NO MOBILE */}
      <div className="sticky bottom-3 z-20 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-lg flex items-center justify-between gap-3">
        <div className="text-left">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total da Encomenda
          </span>
          <span className="text-lg sm:text-xl font-black text-indigo-700">
            {formatCurrency(computedTotal)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={isEditing && initialOrder?.id ? `/dashboard/pedidos/${initialOrder.id}` : '/dashboard/pedidos'}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-97 disabled:bg-indigo-400 rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            {loading ? (
              <span>Salvando...</span>
            ) : isEditing ? (
              <span>Salvar alterações</span>
            ) : (
              <>
                <span>Criar Encomenda</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
