'use client'

import { useState } from 'react'
import { createUserAction, updateUserAction } from './actions'
import type { AdminUser, AdminStore } from '@/lib/db/admin'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  userToEdit?: AdminUser | null
  stores: AdminStore[]
}

export function UserModal({ isOpen, onClose, userToEdit, stores }: UserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isEditing = !!userToEdit

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    let res: { error?: string; success?: boolean }

    if (isEditing && userToEdit) {
      res = await updateUserAction(userToEdit.id, formData)
    } else {
      res = await createUserAction(formData)
    }

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? `Editar Usuário: ${userToEdit.name || userToEdit.email}` : 'Novo Usuário'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing ? 'Atualize dados de acesso e permissões' : 'Cadastre um novo usuário diretamente no sistema'}
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
              Nome Completo
            </label>
            <input
              name="name"
              type="text"
              defaultValue={userToEdit?.name || ''}
              placeholder="Ex: Lucas Silva"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              E-mail *
            </label>
            <input
              name="email"
              type="email"
              required
              defaultValue={userToEdit?.email || ''}
              placeholder="usuario@exemplo.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {isEditing ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
            </label>
            <input
              name="password"
              type="password"
              required={!isEditing}
              placeholder={isEditing ? '••••••••' : 'Mínimo 6 caracteres'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Vincular a uma Loja Existente (opcional)
              </label>
              <select
                name="initial_store_id"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
              >
                <option value="">(Nenhuma loja por enquanto / vincular depois)</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.owner_email ? `(Dono: ${s.owner_email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 bg-purple-50/70 border border-purple-100 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
              <input
                name="make_admin"
                type="checkbox"
                defaultChecked={userToEdit?.is_admin || false}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
              />
              <div>
                <span className="text-sm font-semibold text-purple-900 block">
                  Conceder Acesso Super Admin
                </span>
                <span className="text-xs text-purple-700">
                  Permite gerenciar todas as lojas, usuários e configurações da plataforma.
                </span>
              </div>
            </label>
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
                'Criar Usuário'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
