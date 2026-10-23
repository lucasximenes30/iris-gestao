'use client'

import { useState } from 'react'
import type { Expense } from '@/lib/db/expenses'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/lib/constants'
import { formatCurrency, formatDate, getMonthKey } from '@/lib/formatters'
import { ExpenseModal } from './expense-modal'
import { deleteExpenseAction } from './actions'

interface ExpenseListClientProps {
  expenses: (Expense & { orders?: { title: string; client_name: string } | null })[]
  orders: { id: string; title: string; client_name: string }[]
}

export function ExpenseListClient({ expenses, orders }: ExpenseListClientProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all') // all, current_month, last_month
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null)

  const currentMonth = getMonthKey(0)
  const lastMonth = getMonthKey(-1)

  const filteredExpenses = expenses.filter((e) => {
    // Search
    const matchesSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase())) ||
      (e.orders?.client_name && e.orders.client_name.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    // Category
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false

    // Period
    if (periodFilter === 'current_month') {
      return e.expense_date.startsWith(currentMonth)
    }
    if (periodFilter === 'last_month') {
      return e.expense_date.startsWith(lastMonth)
    }

    return true
  })

  const totalAmount = filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
  const count = filteredExpenses.length
  const avgAmount = count > 0 ? totalAmount / count : 0

  function handleOpenNew() {
    setEditingExpense(null)
    setIsModalOpen(true)
  }

  function handleOpenEdit(exp: Expense) {
    setEditingExpense(exp)
    setIsModalOpen(true)
  }

  async function handleDelete(id: string, desc: string) {
    if (!confirm(`Tem certeza de que deseja excluir a despesa "${desc}"?`)) return
    setLoadingDelete(id)
    await deleteExpenseAction(id)
    setLoadingDelete(null)
  }

  const getCategoryLabel = (val: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === val)?.label || val

  const getPaymentMethodLabel = (val: string) =>
    (PAYMENT_METHODS as any)[val] || val

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total de Despesas
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-red-600 mt-2">
            {formatCurrency(totalAmount)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Filtradas no período</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quantidade de Saídas
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{count}</p>
          <p className="text-xs text-slate-400 mt-1">Lançamentos registrados</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Média por Despesa
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">
            {formatCurrency(avgAmount)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Ticket médio das saídas</p>
        </div>
      </div>

      {/* Action and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              placeholder="Buscar despesa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          >
            <option value="all">Todas as Categorias</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          >
            <option value="all">Todos os Períodos</option>
            <option value="current_month">Este Mês</option>
            <option value="last_month">Mês Passado</option>
          </select>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Despesa
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Data</th>
                <th className="px-5 py-3.5">Descrição</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5">Pagamento</th>
                <th className="px-5 py-3.5">Vínculo</th>
                <th className="px-5 py-3.5">Valor</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Nenhuma despesa encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{exp.description}</p>
                      {exp.notes && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{exp.notes}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {getPaymentMethodLabel(exp.payment_method)}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {exp.orders?.client_name ? (
                        <span className="text-indigo-600 font-medium truncate block max-w-[150px]">
                          {exp.orders.title || exp.orders.client_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-bold text-red-600">
                      - {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id, exp.description)}
                          disabled={loadingDelete === exp.id}
                          className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          {loadingDelete === exp.id ? 'Excluindo...' : 'Excluir'}
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

      {/* Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingExpense}
        orders={orders}
      />
    </div>
  )
}
