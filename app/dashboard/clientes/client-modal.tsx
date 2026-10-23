'use client'

import { useState } from 'react'
import { createClientAction, updateClientAction } from './actions'
import type { Client } from '@/lib/db/clients'

interface ClientModalProps {
  client?: Client | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (savedClient?: any) => void
}

export default function ClientModal({ client, isOpen, onClose, onSuccess }: ClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    let res
    if (client) {
      res = await updateClientAction(client.id, formData)
    } else {
      res = await createClientAction(formData)
    }

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setLoading(false)
      onClose()
      if (onSuccess) onSuccess(res?.client)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="client-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome completo *
            </label>
            <input
              id="client-name"
              name="name"
              type="text"
              required
              defaultValue={client?.name || ''}
              placeholder="Ex: Mariana Silva"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="client-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                WhatsApp / Telefone
              </label>
              <input
                id="client-phone"
                name="phone"
                type="tel"
                defaultValue={client?.phone || ''}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="client-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                E-mail
              </label>
              <input
                id="client-email"
                name="email"
                type="email"
                defaultValue={client?.email || ''}
                placeholder="cliente@email.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="client-address" className="block text-sm font-medium text-slate-700 mb-1.5">
              Endereço padrão de entrega
            </label>
            <input
              id="client-address"
              name="address"
              type="text"
              defaultValue={client?.address || ''}
              placeholder="Rua, número, complemento, bairro"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="client-notes" className="block text-sm font-medium text-slate-700 mb-1.5">
              Observações & Preferências
            </label>
            <textarea
              id="client-notes"
              name="notes"
              rows={3}
              defaultValue={client?.notes || ''}
              placeholder="Preferências de recheios, aniversários, alergias ou restrições alimentares..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
