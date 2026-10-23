'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate, formatDateWithWeekday } from '@/lib/formatters'
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '@/lib/constants'
import type { Order } from '@/lib/db/orders'

interface OrdersViewClientProps {
  initialOrders: Order[]
  initialSearch?: string
  initialStatus?: string
  initialPaymentStatus?: string
}

export default function OrdersViewClient({
  initialOrders,
  initialSearch = '',
  initialStatus = '',
  initialPaymentStatus = ''
}: OrdersViewClientProps) {
  const [search, setSearch] = useState(initialSearch)
  const [activeTab, setActiveTab] = useState<'todos' | 'hoje' | 'semana' | 'producao' | 'prontos' | 'atrasados' | 'pendente_pgto'>('todos')
  const [viewMode, setViewMode] = useState<'cards' | 'agenda'>('cards')

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Cálculo de datas para os próximos 7 dias
  const nextWeekDate = new Date(now)
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const nextWeekStr = `${nextWeekDate.getFullYear()}-${String(nextWeekDate.getMonth() + 1).padStart(2, '0')}-${String(nextWeekDate.getDate()).padStart(2, '0')}`

  // Classificação operacional de pedidos
  const ordersMetrics = useMemo(() => {
    let todayCount = 0
    let weekCount = 0
    let inProductionCount = 0
    let readyCount = 0
    let overdueCount = 0
    let unpaidCount = 0

    initialOrders.forEach(o => {
      const isClosed = o.status === 'completed' || o.status === 'cancelled'

      // Pedidos de hoje
      if (o.event_date === todayStr && o.status !== 'cancelled') {
        todayCount++
      }

      // Próximos 7 dias
      if (o.event_date && o.event_date >= todayStr && o.event_date <= nextWeekStr && o.status !== 'cancelled') {
        weekCount++
      }

      // Em produção
      if (o.status === 'in_production') {
        inProductionCount++
      }

      // Prontos para entrega
      if (o.status === 'ready') {
        readyCount++
      }

      // Atrasados: data no passado e não finalizado
      if (o.event_date && o.event_date < todayStr && !isClosed) {
        overdueCount++
      }

      // Pendente de pagamento
      if ((o.payment_status === 'unpaid' || o.payment_status === 'partial') && o.status !== 'cancelled') {
        unpaidCount++
      }
    })

    return { todayCount, weekCount, inProductionCount, readyCount, overdueCount, unpaidCount }
  }, [initialOrders, todayStr, nextWeekStr])

  // Filtragem dos pedidos conforme busca e aba ativa
  const filteredOrders = useMemo(() => {
    return initialOrders.filter(o => {
      const isClosed = o.status === 'completed' || o.status === 'cancelled'

      // Filtro da aba
      if (activeTab === 'hoje' && (o.event_date !== todayStr || o.status === 'cancelled')) return false
      if (activeTab === 'semana' && (!o.event_date || o.event_date < todayStr || o.event_date > nextWeekStr || o.status === 'cancelled')) return false
      if (activeTab === 'producao' && o.status !== 'in_production') return false
      if (activeTab === 'prontos' && o.status !== 'ready') return false
      if (activeTab === 'atrasados' && (!o.event_date || o.event_date >= todayStr || isClosed)) return false
      if (activeTab === 'pendente_pgto' && (o.payment_status === 'paid' || o.payment_status === 'overpaid' || o.status === 'cancelled')) return false

      // Busca textual
      if (search.trim()) {
        const term = search.toLowerCase()
        const matchesName = o.client_name?.toLowerCase().includes(term)
        const matchesTitle = o.title?.toLowerCase().includes(term)
        const matchesPhone = o.client_phone?.includes(term)
        if (!matchesName && !matchesTitle && !matchesPhone) return false
      }

      return true
    })
  }, [initialOrders, activeTab, search, todayStr, nextWeekStr])

  // Agrupamento por data para visão de Agenda / Calendário diário
  const groupedOrdersByDate = useMemo(() => {
    const groups: { [date: string]: Order[] } = {}
    filteredOrders.forEach(o => {
      const dateKey = o.event_date || 'sem_data'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(o)
    })
    return groups
  }, [filteredOrders])

  const getStatusLabel = (val: string) => ORDER_STATUS_OPTIONS.find(o => o.value === val)?.label || val
  const getPaymentStatusLabel = (val: string) => PAYMENT_STATUS_OPTIONS.find(o => o.value === val)?.label || val

  const getStatusColor = (val: string) => {
    switch (val) {
      case 'draft': return 'bg-slate-100 text-slate-700'
      case 'pending_confirmation': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-700'
      case 'in_production': return 'bg-purple-100 text-purple-700'
      case 'ready': return 'bg-teal-100 text-teal-800'
      case 'completed': return 'bg-emerald-100 text-emerald-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getPaymentStatusColor = (val: string) => {
    switch (val) {
      case 'unpaid': return 'bg-red-100 text-red-700'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'paid': return 'bg-emerald-100 text-emerald-700'
      case 'overpaid': return 'bg-indigo-100 text-indigo-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const isOverdue = (o: Order) => {
    return o.event_date && o.event_date < todayStr && o.status !== 'completed' && o.status !== 'cancelled'
  }

  const isToday = (o: Order) => {
    return o.event_date === todayStr
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pedidos & Encomendas</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Acompanhe a produção, entregas agendadas e recebimentos.
          </p>
        </div>
        <Link
          href="/dashboard/pedidos/novo"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-xs self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo pedido
        </Link>
      </div>

      {/* Painel Operacional de Acompanhamento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setActiveTab('hoje')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'hoje'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Hoje</p>
          <p className="text-xl font-bold text-indigo-600 mt-0.5">{ordersMetrics.todayCount}</p>
          <p className="text-[10px] text-slate-400">entregas</p>
        </button>

        <button
          onClick={() => setActiveTab('semana')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'semana'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Próx. 7 dias</p>
          <p className="text-xl font-bold text-blue-600 mt-0.5">{ordersMetrics.weekCount}</p>
          <p className="text-[10px] text-slate-400">programados</p>
        </button>

        <button
          onClick={() => setActiveTab('producao')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'producao'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Em Produção</p>
          <p className="text-xl font-bold text-purple-600 mt-0.5">{ordersMetrics.inProductionCount}</p>
          <p className="text-[10px] text-slate-400">no forno / bancada</p>
        </button>

        <button
          onClick={() => setActiveTab('prontos')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'prontos'
              ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Prontos</p>
          <p className="text-xl font-bold text-teal-600 mt-0.5">{ordersMetrics.readyCount}</p>
          <p className="text-[10px] text-slate-400">p/ sair ou retirar</p>
        </button>

        <button
          onClick={() => setActiveTab('atrasados')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'atrasados'
              ? 'bg-red-50 border-red-300 ring-2 ring-red-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-red-600 uppercase">Atrasados</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{ordersMetrics.overdueCount}</p>
          <p className="text-[10px] text-red-400 font-medium">atenção urgente</p>
        </button>

        <button
          onClick={() => setActiveTab('pendente_pgto')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'pendente_pgto'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <p className="text-[11px] font-semibold text-amber-700 uppercase">A Receber</p>
          <p className="text-xl font-bold text-amber-700 mt-0.5">{ordersMetrics.unpaidCount}</p>
          <p className="text-[10px] text-amber-600">saldo pendente</p>
        </button>
      </div>

      {/* Barra de Filtros & Alternador de Visão */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <svg className="w-5 h-5 absolute left-3.5 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, título ou telefone..."
              className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Toggle de visão: Cards vs Agenda */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-end sm:self-auto">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Cards
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'agenda' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Agenda Diária
            </button>
          </div>
        </div>

        {/* Abas Rápidas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <button
            onClick={() => setActiveTab('todos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'todos' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({initialOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('hoje')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'hoje' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hoje ({ordersMetrics.todayCount})
          </button>
          <button
            onClick={() => setActiveTab('semana')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'semana' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Próximos 7 dias ({ordersMetrics.weekCount})
          </button>
          <button
            onClick={() => setActiveTab('producao')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'producao' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Em Produção ({ordersMetrics.inProductionCount})
          </button>
          <button
            onClick={() => setActiveTab('prontos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'prontos' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Prontos ({ordersMetrics.readyCount})
          </button>
          <button
            onClick={() => setActiveTab('atrasados')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'atrasados' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Atrasados ({ordersMetrics.overdueCount})
          </button>
          <button
            onClick={() => setActiveTab('pendente_pgto')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'pendente_pgto' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pendente Pgto ({ordersMetrics.unpaidCount})
          </button>
        </div>
      </div>

      {/* Conteúdo: Lista de Pedidos */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Nenhum pedido encontrado</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {search || activeTab !== 'todos'
                ? 'Nenhum pedido corresponde aos filtros ativos.'
                : 'Cadastre sua primeira encomenda para acompanhar entregas, pagamentos e produção.'}
            </p>
          </div>
          {activeTab === 'todos' && !search && (
            <Link
              href="/dashboard/pedidos/novo"
              className="mt-2 inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
            >
              Criar primeiro pedido
            </Link>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* VISÃO EM CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const overdue = isOverdue(order)
            const today = isToday(order)

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl border p-5 flex flex-col justify-between hover:shadow-md transition-all ${
                  overdue
                    ? 'border-red-300 ring-2 ring-red-100'
                    : today
                    ? 'border-indigo-300 ring-2 ring-indigo-50'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {overdue && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse">
                          Atrasado
                        </span>
                      )}
                      {today && !overdue && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                          Hoje!
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getPaymentStatusColor(order.payment_status)}`}>
                        {getPaymentStatusLabel(order.payment_status)}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-1">
                    {order.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium text-slate-700">{order.client_name}</span>
                  </p>

                  {/* Resumo de itens se houver */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-0.5 line-clamp-2">
                      {order.order_items.slice(0, 2).map((it, i) => (
                        <div key={i} className="truncate">
                          • {it.quantity}x {it.name}
                        </div>
                      ))}
                      {order.order_items.length > 2 && (
                        <span className="text-[10px] text-slate-400 italic">
                          +{order.order_items.length - 2} outro(s) item(ns)...
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Data / Horário:</span>
                      <span className={`font-semibold ${overdue ? 'text-red-600' : 'text-slate-700'}`}>
                        {order.event_date ? formatDate(order.event_date) : 'A definir'}
                        {order.event_time && ` às ${order.event_time}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Modalidade:</span>
                      <span className="text-slate-600 font-medium">
                        {order.delivery_type === 'delivery' ? '🚗 Entrega' : '🏪 Retirada'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400">Valor Total:</span>
                      <span className="text-sm font-bold text-slate-800">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/pedidos/${order.id}`}
                    className="flex-1 text-center py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Ver detalhes
                  </Link>
                  <Link
                    href={`/dashboard/pedidos/${order.id}/editar`}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Editar pedido"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* VISÃO EM AGENDA DIÁRIA (AGRUPADA POR DATA) */
        <div className="space-y-6">
          {Object.entries(groupedOrdersByDate).map(([dateKey, dateOrders]) => {
            const isTodayHeader = dateKey === todayStr
            const isOverdueHeader = dateKey !== 'sem_data' && dateKey < todayStr

            return (
              <div key={dateKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className={`px-5 py-3 border-b flex items-center justify-between ${
                  isTodayHeader
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : isOverdueHeader
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-slate-50 border-slate-100 text-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      {dateKey === 'sem_data' ? 'Data a Definir' : formatDateWithWeekday(dateKey)}
                    </span>
                    {isTodayHeader && (
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold">
                        HOJE
                      </span>
                    )}
                    {isOverdueHeader && (
                      <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                        Passado / Atrasado
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold opacity-75">
                    {dateOrders.length} {dateOrders.length === 1 ? 'encomenda' : 'encomendas'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {dateOrders.map(order => (
                    <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            {order.event_time ? `🕒 ${order.event_time}` : 'Sem horário fixado'}
                          </span>
                          <span className="text-xs text-slate-500">
                            • {order.delivery_type === 'delivery' ? '🚗 Entrega' : '🏪 Retirada'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-base">{order.title}</h4>
                        <p className="text-xs text-slate-500">
                          Cliente: <span className="font-medium text-slate-700">{order.client_name}</span>
                          {order.client_phone && ` (${order.client_phone})`}
                        </p>
                      </div>

                      <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2">
                        <span className="text-base font-bold text-slate-800">
                          {formatCurrency(order.total_amount)}
                        </span>
                        <Link
                          href={`/dashboard/pedidos/${order.id}`}
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Ver detalhes →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
