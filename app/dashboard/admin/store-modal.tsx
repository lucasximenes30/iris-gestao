'use client'

import { useState } from 'react'
import { createStoreAction, updateStoreAction } from './actions'
import type { AdminUser, AdminStore } from '@/lib/db/admin'

interface StoreModalProps {
  isOpen: boolean
  onClose: () => void
  storeToEdit?: AdminStore | null
  users: AdminUser[]
}

export function StoreModal({ isOpen, onClose, storeToEdit, users }: StoreModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isEditing = !!storeToEdit

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    let res: { error?: string; success?: boolean }

    if (isEditing && storeToEdit) {
      res = await updateStoreAction(storeToEdit.id, formData)
    } else {
      res = await createStoreAction(formData)
    }

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setLoading(false)
      onClose()
    }
  }

  // Encontra o user_id do owner atual se estiver editando
  const currentOwner = users.find(u => u.email === storeToEdit?.owner_email)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? `Editar Loja: ${storeToEdit.name}` : 'Nova Loja'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing ? 'Atualize os dados e o proprietário da loja' : 'Cadastre uma nova loja na plataforma'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nome da Loja *
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={storeToEdit?.name || ''}
              placeholder="Ex: Doce Sonho Confeitaria"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Slug / Identificador (opcional)
              </label>
              <input
                name="slug"
                type="text"
                defaultValue={storeToEdit?.slug || ''}
                placeholder="doce-sonho"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Telefone / WhatsApp
              </label>
              <input
                name="phone"
                type="text"
                defaultValue={storeToEdit?.phone || ''}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              CPF ou CNPJ (opcional)
            </label>
            <input
              name="document"
              type="text"
              defaultValue={storeToEdit?.document || ''}
              placeholder="00.000.000/0001-00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Proprietário da Loja (Usuário)
            </label>
            <select
              name="owner_user_id"
              defaultValue={currentOwner?.id || ''}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
            >
              <option value="">(Nenhum proprietário inicial / vincular depois)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} {u.name ? `(${u.name})` : ''} {u.is_admin ? '⭐ Admin' : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              O proprietário terá acesso total a esta loja no painel principal.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Salvando...
                </>
              ) : isEditing ? (
                'Salvar Alterações'
              ) : (
                'Criar Loja'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
