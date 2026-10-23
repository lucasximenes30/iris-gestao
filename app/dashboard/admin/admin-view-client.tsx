'use client'

import { useState } from 'react'
import type { AdminStore, AdminUser } from '@/lib/db/admin'
import { StoreModal } from './store-modal'
import { UserModal } from './user-modal'
import { deleteUserAction, toggleAdminAction, deleteStoreAction } from './actions'
import { formatDate } from '@/lib/formatters'

interface AdminViewClientProps {
  stores: AdminStore[]
  users: AdminUser[]
  currentUserId: string
}

export function AdminViewClient({ stores, users, currentUserId }: AdminViewClientProps) {
  const [tab, setTab] = useState<'stores' | 'users'>('stores')
  
  // Store Modal State
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false)
  const [storeToEdit, setStoreToEdit] = useState<AdminStore | null>(null)

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null)

  const [searchStore, setSearchStore] = useState('')
  const [searchUser, setSearchUser] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStore.toLowerCase()) ||
      (s.slug && s.slug.toLowerCase().includes(searchStore.toLowerCase())) ||
      (s.owner_email && s.owner_email.toLowerCase().includes(searchStore.toLowerCase()))
  )

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchUser.toLowerCase()))
  )

  const totalAdmins = users.filter((u) => u.is_admin).length

  // User Actions
  async function handleDeleteUser(user: AdminUser) {
    if (user.id === currentUserId) {
      alert('Você não pode excluir sua própria conta enquanto estiver logado.')
      return
    }

    const confirmed = confirm(
      `Tem certeza de que deseja excluir permanentemente o usuário "${user.email}"?\n\nEsta ação excluirá o usuário do sistema.`
    )
    if (!confirmed) return

    setLoadingAction(`delete-user-${user.id}`)
    setMessage(null)

    const res = await deleteUserAction(user.id)
    if (res?.error) {
      setMessage({ text: res.error, type: 'error' })
    } else {
      setMessage({ text: `Usuário ${user.email} excluído com sucesso.`, type: 'success' })
    }
    setLoadingAction(null)
  }

  async function handleToggleAdmin(user: AdminUser) {
    const nextState = !user.is_admin
    const msg = nextState
      ? `Deseja conceder permissões de Super Administrador para "${user.email}"?`
      : `Deseja remover as permissões de Super Administrador de "${user.email}"?`

    if (!confirm(msg)) return

    setLoadingAction(`admin-${user.id}`)
    setMessage(null)

    const res = await toggleAdminAction(user.id, nextState)
    if (res?.error) {
      setMessage({ text: res.error, type: 'error' })
    } else {
      setMessage({
        text: `Permissões de ${user.email} atualizadas com sucesso.`,
        type: 'success',
      })
    }
    setLoadingAction(null)
  }

  // Store Actions
  async function handleDeleteStore(store: AdminStore) {
    const confirmed = confirm(
      `Tem certeza de que deseja excluir permanentemente a loja "${store.name}"?\n\nATENÇÃO: Todos os pedidos, produtos, clientes e despesas associados a esta loja serão removidos.`
    )
    if (!confirmed) return

    setLoadingAction(`delete-store-${store.id}`)
    setMessage(null)

    const res = await deleteStoreAction(store.id)
    if (res?.error) {
      setMessage({ text: res.error, type: 'error' })
    } else {
      setMessage({ text: `Loja "${store.name}" excluída com sucesso.`, type: 'success' })
    }
    setLoadingAction(null)
  }

  return (
    <div className="space-y-6">
      {/* Notice / Feedback */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between animate-in fade-in duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs underline hover:no-underline ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total de Lojas
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{stores.length}</p>
          <p className="text-xs text-slate-400 mt-1">Lojas ativas na plataforma</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Usuários Registrados
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{users.length}</p>
          <p className="text-xs text-slate-400 mt-1">Contas em auth.users</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Administradores
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-700 mt-2">{totalAdmins}</p>
          <p className="text-xs text-slate-400 mt-1">Com acesso total a este painel</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-6">
        <button
          onClick={() => setTab('stores')}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            tab === 'stores'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Lojas Cadastradas ({stores.length})
          {tab === 'stores' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setTab('users')}
          className={`pb-3 text-sm font-semibold transition-colors relative ${
            tab === 'users'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Usuários da Plataforma ({users.length})
          {tab === 'users' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: LOJAS */}
      {tab === 'stores' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Buscar por nome, slug ou dono..."
                value={searchStore}
                onChange={(e) => setSearchStore(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button
              onClick={() => {
                setStoreToEdit(null)
                setIsStoreModalOpen(true)
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Loja
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Nome da Loja</th>
                    <th className="px-5 py-3.5">Slug</th>
                    <th className="px-5 py-3.5">Contato</th>
                    <th className="px-5 py-3.5">Proprietário</th>
                    <th className="px-5 py-3.5">Membros</th>
                    <th className="px-5 py-3.5">Criada em</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                        Nenhuma loja encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredStores.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {s.name}
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-mono text-xs">
                          {s.slug || '-'}
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-xs">
                          {s.phone ? (
                            <div>{s.phone}</div>
                          ) : (
                            <span className="text-slate-400">Não informado</span>
                          )}
                          {s.document && (
                            <div className="text-slate-400 font-mono text-[11px] mt-0.5">{s.document}</div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-700 text-xs">
                          {s.owner_email || <span className="text-slate-400 italic">Sem dono</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {s.members_count} {s.members_count === 1 ? 'membro' : 'membros'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">
                          {formatDate(s.created_at)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setStoreToEdit(s)
                                setIsStoreModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteStore(s)}
                              disabled={loadingAction === `delete-store-${s.id}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              {loadingAction === `delete-store-${s.id}` ? 'Excluindo...' : 'Excluir'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USUÁRIOS */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Buscar por email ou nome..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button
              onClick={() => {
                setUserToEdit(null)
                setIsUserModalOpen(true)
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Usuário
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Usuário / Email</th>
                    <th className="px-5 py-3.5">Lojas Vinculadas</th>
                    <th className="px-5 py-3.5">Papel</th>
                    <th className="px-5 py-3.5">Cadastro</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isMe = u.id === currentUserId
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{u.email}</span>
                              {isMe && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                  VOCÊ
                                </span>
                              )}
                            </div>
                            {u.name && <div className="text-xs text-slate-500 mt-0.5">{u.name}</div>}
                          </td>
                          <td className="px-5 py-4">
                            {u.stores.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">Sem loja</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {u.stores.map((st) => (
                                  <span
                                    key={st.store_id}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700"
                                  >
                                    {st.store_name} ({st.role})
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {u.is_admin ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Super Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                Usuário
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Edit User */}
                              <button
                                onClick={() => {
                                  setUserToEdit(u)
                                  setIsUserModalOpen(true)
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                              >
                                Editar
                              </button>

                              {/* Toggle Admin */}
                              <button
                                onClick={() => handleToggleAdmin(u)}
                                disabled={loadingAction === `admin-${u.id}` || isMe}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  u.is_admin
                                    ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                } ${isMe ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={isMe ? 'Você não pode alterar seu próprio privilégio' : ''}
                              >
                                {loadingAction === `admin-${u.id}`
                                  ? 'Salvando...'
                                  : u.is_admin
                                  ? 'Revogar Admin'
                                  : 'Tornar Admin'}
                              </button>

                              {/* Delete User */}
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={loadingAction === `delete-user-${u.id}` || isMe}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors ${
                                  isMe ? 'opacity-40 cursor-not-allowed' : ''
                                }`}
                                title={isMe ? 'Você não pode excluir sua própria conta' : 'Excluir usuário'}
                              >
                                {loadingAction === `delete-user-${u.id}` ? 'Excluindo...' : 'Excluir'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Store Modal (Create / Edit) */}
      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => {
          setIsStoreModalOpen(false)
          setStoreToEdit(null)
        }}
        storeToEdit={storeToEdit}
        users={users}
      />

      {/* User Modal (Create / Edit) */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false)
          setUserToEdit(null)
        }}
        userToEdit={userToEdit}
        stores={stores}
      />
    </div>
  )
}
