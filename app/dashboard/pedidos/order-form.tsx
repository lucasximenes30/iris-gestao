'use client'

import { useState, useId } from 'react'
import Link from 'next/link'
import { createOrderAction, updateOrderAction } from './actions'
import { ORDER_STATUS_OPTIONS, DELIVERY_TYPE_OPTIONS } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'
import type { Client } from '@/lib/db/clients'
import type { Product } from '@/lib/db/products'
import type { Order, OrderItem } from '@/lib/db/orders'

interface OrderFormProps {
  initialOrder?: (Order & { order_items?: OrderItem[] }) | null
  availableClients: Client[]
  availableProducts: Product[]
  defaultClientId?: string
}

export default function OrderForm({
  initialOrder,
  availableClients,
  availableProducts,
  defaultClientId
}: OrderFormProps) {
  const isEditing = !!initialOrder

  // Cliente
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialOrder?.client_id || defaultClientId || ''
  )
  const [clientName, setClientName] = useState<string>(initialOrder?.client_name || '')
  const [clientPhone, setClientPhone] = useState<string>(initialOrder?.client_phone || '')
  const [clientEmail, setClientEmail] = useState<string>(initialOrder?.client_email || '')

  // Logística (Entrega / Retirada)
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>(
    (initialOrder?.delivery_type as 'pickup' | 'delivery') || 'pickup'
  )
  const [deliveryAddress, setDeliveryAddress] = useState<string>(
    initialOrder?.delivery_address || ''
  )
  const [deliveryFee, setDeliveryFee] = useState<number>(initialOrder?.delivery_fee || 0)
  const [discountAmount, setDiscountAmount] = useState<number>(initialOrder?.discount_amount || 0)

  // Itens do Pedido
  const [items, setItems] = useState<OrderItem[]>(
    initialOrder?.order_items && initialOrder.order_items.length > 0
      ? initialOrder.order_items.map(it => ({ ...it }))
      : []
  )

  // Status & Custo
  const [status, setStatus] = useState<string>(initialOrder?.status || 'confirmed')
  const [estimatedCost, setEstimatedCost] = useState<number | ''>(
    initialOrder?.estimated_cost !== null && initialOrder?.estimated_cost !== undefined
      ? initialOrder.estimated_cost
      : ''
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Quando o usuário seleciona um cliente existente no select
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

  // Adicionar item a partir do catálogo
  const handleAddProduct = (productId: string) => {
    if (!productId) return
    const prod = availableProducts.find(p => p.id === productId)
    if (!prod) return

    setItems(prev => [
      ...prev,
      {
        product_id: prod.id,
        name: prod.name,
        quantity: 1,
        unit_price: Number(prod.price) || 0,
        total_price: Number(prod.price) || 0,
        notes: ''
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
        notes: ''
      }
    ])
  }

  // Atualizar campo de um item
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    setItems(prev => {
      const copy = [...prev]
      const current = { ...copy[index], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        const q = Number(current.quantity) || 0
        const p = Number(current.unit_price) || 0
        current.total_price = Math.round(q * p * 100) / 100
      }
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
  
  // Se houver itens na lista, o valor total é calculado dinamicamente.
  // Se não houver itens (pedido simples/legado), permite digitação manual.
  const [manualTotal, setManualTotal] = useState<number>(initialOrder?.total_amount || 0)
  const computedTotal = items.length > 0
    ? Math.max(0, itemsSubtotal + (Number(deliveryFee) || 0) - (Number(discountAmount) || 0))
    : manualTotal

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set('items', JSON.stringify(items))
    formData.set('total_amount', computedTotal.toString())
    formData.set('delivery_type', deliveryType)
    formData.set('delivery_fee', deliveryFee.toString())
    formData.set('discount_amount', discountAmount.toString())
    if (selectedClientId) formData.set('client_id', selectedClientId)

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* 1. SEÇÃO DO CLIENTE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm">1. Dados do Cliente</h2>
          {availableClients.length > 0 && (
            <span className="text-xs text-slate-400">
              {availableClients.length} clientes cadastrados
            </span>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Seletor de cliente existente */}
          {availableClients.length > 0 && (
            <div>
              <label htmlFor="select-client" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Selecionar cliente existente (opcional)
              </label>
              <select
                id="select-client"
                value={selectedClientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- Ou digite um novo cliente abaixo --</option>
                {availableClients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="client_name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nome do cliente *
              </label>
              <input
                id="client_name"
                name="client_name"
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Ana Clara"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="client_phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                WhatsApp / Telefone
              </label>
              <input
                id="client_phone"
                name="client_phone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="client_email" className="block text-sm font-medium text-slate-700 mb-1.5">
                E-mail
              </label>
              <input
                id="client_email"
                name="client_email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. ITENS DO PEDIDO (PRODUTOS & SABORES) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">2. Produtos & Encomendas</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Adicione bolos, docinhos ou kits com seus sabores e personalizações.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {availableProducts.length > 0 && (
              <select
                onChange={(e) => {
                  handleAddProduct(e.target.value)
                  e.target.value = ''
                }}
                defaultValue=""
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <option value="" disabled>+ Do catálogo...</option>
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
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              + Item personalizado
            </button>
          </div>
        </div>

        <div className="p-6">
          {items.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
              <p className="text-sm text-slate-600 font-medium">Nenhum produto adicionado ainda</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Você pode adicionar produtos do seu catálogo ou criar itens personalizados com sabores, peso e decoração.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Adicionar item avulso
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Descrição do doce / item *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="Ex: Bolo 2kg Ninho c/ Morango"
                        className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Qtd *
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Unitário (R$) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-5 sm:pt-6">
                      <span className="font-bold text-slate-800 text-sm">
                        {formatCurrency(item.total_price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Remover item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                      placeholder="Notas de sabor, decoração, escrita do bolo ou solicitações especiais..."
                      className="w-full px-3 py-1 bg-white rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-2 text-sm font-semibold text-slate-700">
                Subtotal dos produtos: <span className="ml-2 text-indigo-600">{formatCurrency(itemsSubtotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. LOGÍSTICA & DATAS (ENTREGA OU RETIRADA) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 text-sm">3. Data, Horário & Logística</h2>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
                Título / Identificação do Pedido
              </label>
              <input
                id="title"
                name="title"
                type="text"
                defaultValue={initialOrder?.title || ''}
                placeholder="Ex: Aniversário da Maria (Bolo + Doces)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="event_date" className="block text-sm font-medium text-slate-700 mb-1.5">
                Data prevista para entrega/retirada
              </label>
              <input
                id="event_date"
                name="event_date"
                type="date"
                defaultValue={initialOrder?.event_date || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="event_time" className="block text-sm font-medium text-slate-700 mb-1.5">
                Horário combinado
              </label>
              <input
                id="event_time"
                name="event_time"
                type="time"
                defaultValue={initialOrder?.event_time || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Modalidade de Entrega / Retirada */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Envio
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {DELIVERY_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeliveryType(opt.value as 'pickup' | 'delivery')}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all ${
                    deliveryType === opt.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {deliveryType === 'delivery' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="sm:col-span-2">
                <label htmlFor="delivery_address" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Endereço completo de entrega *
                </label>
                <input
                  id="delivery_address"
                  name="delivery_address"
                  type="text"
                  required={deliveryType === 'delivery'}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Rua, número, complemento, bairro"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="delivery_fee" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Taxa de Entrega (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">R$</span>
                  <input
                    id="delivery_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryFee || ''}
                    onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="event_location" className="block text-sm font-medium text-slate-700 mb-1.5">
                Local de retirada
              </label>
              <input
                id="event_location"
                name="event_location"
                type="text"
                defaultValue={initialOrder?.event_location || 'Ateliê / Loja'}
                placeholder="Endereço do ateliê ou ponto de encontro"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. TOTAIS, STATUS & OBSERVAÇÕES */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 text-sm">4. Valores, Status & Observações</h2>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="discount_amount" className="block text-sm font-medium text-slate-700 mb-1.5">
                Desconto (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">R$</span>
                <input
                  id="discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="total_amount" className="block text-sm font-medium text-slate-700 mb-1.5">
                Valor Total do Pedido {items.length > 0 && '(Calculado)'} *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-bold">R$</span>
                <input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  readOnly={items.length > 0}
                  value={computedTotal}
                  onChange={(e) => setManualTotal(Number(e.target.value) || 0)}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    items.length > 0
                      ? 'bg-slate-100 border-slate-300 text-indigo-700'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="estimated_cost" className="block text-sm font-medium text-slate-700 mb-1.5">
                Custo Estimado (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">R$</span>
                <input
                  id="estimated_cost"
                  name="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1.5">
                Status Operacional do Pedido
              </label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1.5">
                Observações Gerais do Pedido
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={initialOrder?.notes || ''}
                placeholder="Ex: Embalar para presente, avisar quando sair para entrega, etc..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AÇÕES DE SUBMISSÃO */}
      <div className="flex items-center justify-end gap-3 pt-3">
        <Link
          href={isEditing && initialOrder?.id ? `/dashboard/pedidos/${initialOrder.id}` : '/dashboard/pedidos'}
          className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors shadow-xs"
        >
          {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Confirmar e criar pedido'}
        </button>
      </div>
    </form>
  )
}
