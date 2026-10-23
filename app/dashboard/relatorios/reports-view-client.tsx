'use client'

import { useState } from 'react'
import type { Order } from '@/lib/db/orders'
import type { Expense } from '@/lib/db/expenses'
import type { CashMovement } from '@/lib/db/cash-movements'
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, ORDER_STATUS } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'

interface ReportsViewClientProps {
  orders: Order[]
  expenses: Expense[]
  movements: CashMovement[]
}

export function ReportsViewClient({ orders, expenses, movements }: ReportsViewClientProps) {
  const [period, setPeriod] = useState<'current_month' | 'last_month' | 'last_3_months' | 'year' | 'all'>('current_month')

  const now = new Date()
  const currentMonthStr = now.toISOString().slice(0, 7)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStr = lastMonthDate.toISOString().slice(0, 7)

  const threeMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const threeMonthsAgoStr = threeMonthsAgoDate.toISOString().slice(0, 10)

  const currentYearStr = now.getFullYear().toString()

  // Filter Movements
  const filteredMovements = movements.filter((m) => {
    if (period === 'current_month') return m.movement_date.startsWith(currentMonthStr)
    if (period === 'last_month') return m.movement_date.startsWith(lastMonthStr)
    if (period === 'last_3_months') return m.movement_date >= threeMonthsAgoStr
    if (period === 'year') return m.movement_date.startsWith(currentYearStr)
    return true
  })

  // Filter Orders
  const filteredOrders = orders.filter((o) => {
    const d = o.event_date || o.created_at?.slice(0, 10)
    if (!d) return true
    if (period === 'current_month') return d.startsWith(currentMonthStr)
    if (period === 'last_month') return d.startsWith(lastMonthStr)
    if (period === 'last_3_months') return d >= threeMonthsAgoStr
    if (period === 'year') return d.startsWith(currentYearStr)
    return true
  })

  // Filter Expenses
  const filteredExpenses = expenses.filter((e) => {
    if (period === 'current_month') return e.expense_date.startsWith(currentMonthStr)
    if (period === 'last_month') return e.expense_date.startsWith(lastMonthStr)
    if (period === 'last_3_months') return e.expense_date >= threeMonthsAgoStr
    if (period === 'year') return e.expense_date.startsWith(currentYearStr)
    return true
  })

  // Financial KPIs
  const totalIncome = filteredMovements
    .filter((m) => m.type === 'income')
    .reduce((sum, m) => sum + Number(m.amount || 0), 0)

  const totalExpense = filteredMovements
    .filter((m) => m.type === 'expense')
    .reduce((sum, m) => sum + Number(m.amount || 0), 0)

  const netProfit = totalIncome - totalExpense
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

  const confirmedOrders = filteredOrders.filter((o) => o.status !== 'cancelled' && o.status !== 'draft')
  const totalOrdersAmount = confirmedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  const averageTicket = confirmedOrders.length > 0 ? totalOrdersAmount / confirmedOrders.length : 0

  // Category breakdown for expenses
  const expensesByCategory: Record<string, number> = {}
  filteredExpenses.forEach((e) => {
    const cat = e.category || 'outros'
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.amount || 0)
  })

  const sortedCategories = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])

  // Payment methods breakdown for income
  const incomeByMethod: Record<string, number> = {}
  filteredMovements
    .filter((m) => m.type === 'income')
    .forEach((m) => {
      const method = m.payment_method || 'pix'
      incomeByMethod[method] = (incomeByMethod[method] || 0) + Number(m.amount || 0)
    })

  const sortedMethods = Object.entries(incomeByMethod).sort((a, b) => b[1] - a[1])

  // Orders by status
  const ordersByStatus: Record<string, number> = {}
  filteredOrders.forEach((o) => {
    ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
  })

  const getCategoryLabel = (cat: string) =>
    EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label || cat

  const getMethodLabel = (val: string) =>
    (PAYMENT_METHODS as any)[val] || val

  const getStatusLabel = (val: string) =>
    (ORDER_STATUS as any)[val] || val

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Filters and Print Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Período:
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            <option value="current_month">Este Mês</option>
            <option value="last_month">Mês Passado</option>
            <option value="last_3_months">Últimos 3 Meses</option>
            <option value="year">Ano Atual ({currentYearStr})</option>
            <option value="all">Todo o Histórico</option>
          </select>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / Exportar PDF
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Faturamento Recebido
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">
            {formatCurrency(totalIncome)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Total creditado no caixa</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Despesas & Custos
          </span>
          <p className="text-2xl font-extrabold text-red-600 mt-2">
            {formatCurrency(totalExpense)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Total debitado no caixa</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Lucro Operacional
          </span>
          <p
            className={`text-2xl font-extrabold mt-2 ${
              netProfit >= 0 ? 'text-indigo-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(netProfit)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                profitMargin >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {profitMargin.toFixed(1)}% margem
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Ticket Médio
          </span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(averageTicket)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {confirmedOrders.length} encomendas confirmadas
          </p>
        </div>
      </div>

      {/* Grid: Despesas por Categoria & Métodos de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Despesas por Categoria
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            Onde seu dinheiro foi gasto no período
          </p>

          {sortedCategories.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhuma despesa registrada no período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCategories.map(([cat, val]) => {
                const percentage = totalExpense > 0 ? (val / totalExpense) * 100 : 0
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {getCategoryLabel(cat)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(val)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Income by Payment Method */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Formas de Recebimento
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            Distribuição dos pagamentos recebidos
          </p>

          {sortedMethods.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhuma entrada registrada no período selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedMethods.map(([method, val]) => {
                const percentage = totalIncome > 0 ? (val / totalIncome) * 100 : 0
                return (
                  <div key={method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {getMethodLabel(method)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(val)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Orders Volume Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Volume de Encomendas por Etapa
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Distribuição de status dos pedidos no período
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(ORDER_STATUS).map(([statusKey, label]) => {
            if (statusKey === 'scheduled') return null
            const count = ordersByStatus[statusKey] || 0
            return (
              <div
                key={statusKey}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center"
              >
                <p className="text-2xl font-black text-slate-800">{count}</p>
                <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-1" title={label}>
                  {label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
