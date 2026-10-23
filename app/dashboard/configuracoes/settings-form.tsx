'use client'

import { useState } from 'react'
import type { Store } from '@/lib/db/stores'
import { updateStoreSettingsAction } from './actions'

interface SettingsFormProps {
  store: Store
  role: string
}

export function SettingsForm({ store, role }: SettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const res = await updateStoreSettingsAction(formData)

    if (res?.error) {
      setMessage({ text: res.error, type: 'error' })
    } else {
      setMessage({ text: 'Configurações da loja atualizadas com sucesso!', type: 'success' })
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden max-w-2xl">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Dados da Loja</h2>
          <p className="text-xs text-slate-500 mt-0.5">Informações cadastrais e de contato do negócio</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 uppercase tracking-wide">
          Seu papel: {role}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Nome Comercial da Confeitaria / Loja *
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={store.name}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Telefone / WhatsApp
            </label>
            <input
              name="phone"
              type="text"
              placeholder="(11) 98765-4321"
              defaultValue={store.phone || ''}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              CPF ou CNPJ
            </label>
            <input
              name="document"
              type="text"
              placeholder="00.000.000/0001-00"
              defaultValue={store.document || ''}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Fuso Horário
          </label>
          <select
            name="timezone"
            defaultValue={store.timezone || 'America/Sao_Paulo'}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all"
          >
            <option value="America/Sao_Paulo">Horário de Brasília (America/Sao_Paulo)</option>
            <option value="America/Manaus">Horário do Amazonas (America/Manaus)</option>
            <option value="America/Fortaleza">Horário do Nordeste (America/Fortaleza)</option>
            <option value="America/Cuiaba">Horário de Cuiabá (America/Cuiaba)</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
