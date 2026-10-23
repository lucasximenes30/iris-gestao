'use client'

import { useState } from 'react'
import type { CashMovement } from '@/lib/db/cash-movements'
import { PAYMENT_METHOD_OPTIONS } from '@/lib/constants'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import { ManualMovementModal } from './manual-movement-modal'
import { deleteManualMovementAction } from './actions'

interface CaixaViewClientProps {
  initialMovements: CashMovement[]
}

export function CaixaViewClient({ initialMovements }: CaixaViewClientProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [periodFilter, setPeriodFilter] = useState<'all' | 'current_month' | 'last_month'>('current_month')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null)

  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = lastMonthDate.toISOString().slice(0, 7)

  const filteredMovements = initialMovements.filter((m) => {
    // Search
    const matchesSearch =
      m.description.toLowerCase().includes(search.toLowerCase()) ||
      (m.payment_method && m.payment_method.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    // Type
    if (typeFilter !== 'all' && m.type !== typeFilter) return false

    // Period
    if (periodFilter === 'current_month') {
      return m.movement_date.startsWith(currentMonth)
    }
    if (periodFilter === 'last_month') {
      return m.movement_date.startsWith(lastMonth)
    }

    return true
  })

  let totalIncome = 0
  let totalExpense = 0

  filteredMovements.forEach((m) => {
    if (m.type === 'income') totalIncome += Number(m.amount)
    if (m.type === 'expense') totalExpense += Number(m.amount)
  })

  const balance = totalIncome - totalExpense

  const getMethodLabel = (val?: string | null) =>
    PAYMENT_METHOD_OPTIONS.find((opt) => opt.value === val)?.label || val || 'Outro'

  const getSourceLabel = (val: string) => {
    switch (val) {
      case 'payment':
        return 'Pagamento de Pedido'
      case 'expense':
        return 'Despesa Lançada'
      case 'manual':
        return 'Lançamento Manual'
      default:
        return val
    }
  }

  async function handleDeleteManual(id: string, desc: string) {
    if (!confirm(`Deseja excluir a movimentação manual "${desc}"?`)) return
    setLoadingDelete(id)
    await deleteManualMovementAction(id)
    setLoadingDelete(null)
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Entradas Totais
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">
            {formatCurrency(totalIncome)}
          </p>
          <p className="text-xs text-emerald-600/80 mt-1">Total recebido no período</p>
        </div>

        <div className="bg-red-50 rounded-xl border border-red-100 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">
              Saídas Totais
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-extrabold text-red-700 mt-2">
            {formatCurrency(totalExpense)}
          </p>
          <p className="text-xs text-red-600/80 mt-1">Total gasto / retiradas no período</p>
        </div>

        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Saldo Líquido
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p
            className={`text-2xl font-extrabold mt-2 ${
              balance >= 0 ? 'text-indigo-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-indigo-600/80 mt-1">Disponível em caixa</p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              placeholder="Buscar no extrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          >
            <option value="all">Todas as Movimentações</option>
            <option value="income">Apenas Entradas (+)</option>
            <option value="expense">Apenas Saídas (-)</option>
          </select>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          >
            <option value="current_month">Este Mês</option>
            <option value="last_month">Mês Passado</option>
            <option value="all">Todo o Histórico</option>
          </select>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Lançamento Manual
        </button>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Extrato de Movimentações</h2>
          <span className="text-xs text-slate-400">
            {filteredMovements.length} {filteredMovements.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Nenhuma movimentação encontrada</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Pagamentos de pedidos, despesas e lançamentos manuais aparecerão aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMovements.map((m) => {
              const isIncome = m.type === 'income'
              return (
                <div
                  key={m.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{m.description}</p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {isIncome ? 'Entrada' : 'Saída'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">
                        {formatDateTime(m.movement_date)}
                      </span>
                      <span>•</span>
                      <span>{getMethodLabel(m.payment_method)}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium text-[11px]">
                        {getSourceLabel(m.source)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span
                      className={`text-lg font-bold ${
                        isIncome ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isIncome ? '+ ' : '- '}
                      {formatCurrency(m.amount)}
                    </span>

                    {/* Delete action only for manual cash movements */}
                    {m.source === 'manual' && (
                      <button
                        onClick={() => handleDeleteManual(m.id, m.description)}
                        disabled={loadingDelete === m.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir lançamento manual"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Manual Movement Modal */}
      <ManualMovementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
