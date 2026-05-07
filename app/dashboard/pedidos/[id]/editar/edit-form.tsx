'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateOrderAction } from '../../actions'
import { ORDER_STATUS_OPTIONS } from '@/lib/constants'

export default function EditOrderForm({ order }: { order: any }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateOrderAction(order.id, formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/pedidos/${order.id}`}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editar Pedido</h1>
          <p className="text-slate-500 mt-1 text-sm">Atualize os dados do evento ou cliente.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-indigo-800">
            <strong>Dica:</strong> Você pode salvar o pedido agora apenas com o nome do cliente e completar os demais dados depois.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Dados do Cliente</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="client_name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nome do cliente *
              </label>
              <input
                id="client_name"
                name="client_name"
                type="text"
                defaultValue={order.client_name}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="client_phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                Telefone / WhatsApp
              </label>
              <input
                id="client_phone"
                name="client_phone"
                type="tel"
                defaultValue={order.client_phone || ''}
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
                defaultValue={order.client_email || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Dados do Evento</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
                Título do pedido
              </label>
              <input
                id="title"
                name="title"
                type="text"
                defaultValue={order.title || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="event_date" className="block text-sm font-medium text-slate-700 mb-1.5">
                Data do evento
              </label>
              <input
                id="event_date"
                name="event_date"
                type="date"
                defaultValue={order.event_date || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="event_time" className="block text-sm font-medium text-slate-700 mb-1.5">
                Horário
              </label>
              <input
                id="event_time"
                name="event_time"
                type="time"
                defaultValue={order.event_time || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="event_location" className="block text-sm font-medium text-slate-700 mb-1.5">
                Local do evento
              </label>
              <input
                id="event_location"
                name="event_location"
                type="text"
                defaultValue={order.event_location || ''}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Valores e Status</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="total_amount" className="block text-sm font-medium text-slate-700 mb-1.5">
                Valor Total
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">R$</span>
                <input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={order.total_amount}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="estimated_cost" className="block text-sm font-medium text-slate-700 mb-1.5">
                Custo Estimado
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">R$</span>
                <input
                  id="estimated_cost"
                  name="estimated_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={order.estimated_cost || ''}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1.5">
                Status do Pedido
              </label>
              <select
                id="status"
                name="status"
                defaultValue={order.status}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Observações</h2>
          </div>
          <div className="p-6">
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={order.notes || ''}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/dashboard/pedidos/${order.id}`}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors"
          >
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
