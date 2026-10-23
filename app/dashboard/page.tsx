import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getOrders, type Order } from '@/lib/db/orders'
import { getCashMovements, type CashMovement } from '@/lib/db/cash-movements'
import { getActiveStore } from '@/lib/db/stores'
import { formatCurrency, formatDate } from '@/lib/formatters'

const quickLinks = [
  { href: '/dashboard/pedidos/novo', label: 'Novo Pedido', desc: 'Registrar encomenda ou festa', color: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50' },
  { href: '/dashboard/clientes', label: 'Novo Cliente', desc: 'Cadastrar ou buscar contatos', color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50' },
  { href: '/dashboard/produtos', label: 'Catálogo de Doces', desc: 'Gerenciar produtos e preços', color: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50' },
  { href: '/dashboard/despesas', label: 'Nova Despesa', desc: 'Lançar saída de caixa ou insumo', color: 'border-red-200 hover:border-red-300 hover:bg-red-50' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const firstName = user?.email?.split('@')[0] ?? 'Usuário'

  let activeStore = null
  try {
    activeStore = await getActiveStore()
  } catch (err) {
    console.error('Erro ao buscar loja ativa:', err)
  }

  const storeId = activeStore?.store?.id
  const storeName = activeStore?.store?.name || 'Minha Loja'

  let orders: Order[] = []
  let cashMovements: CashMovement[] = []
  try {
    orders = await getOrders({ storeId }) || []
    cashMovements = await getCashMovements({ storeId }) || []
  } catch (err) {
    console.error(err)
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Filtra apenas pedidos ativos (não cancelados) criados no mês atual
  const monthlyOrders = orders.filter((o: any) => {
    if (o.status === 'cancelled') return false
    const date = new Date(o.created_at)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  let income = 0
  let expense = 0

  cashMovements.forEach((cm: any) => {
    // movement_date é 'YYYY-MM-DD'
    let mMonth: number
    let mYear: number
    if (typeof cm.movement_date === 'string' && cm.movement_date.includes('-')) {
      const parts = cm.movement_date.split('-').map(Number)
      mYear = parts[0]
      mMonth = parts[1] - 1
    } else {
      const d = new Date(cm.movement_date)
      mMonth = d.getMonth()
      mYear = d.getFullYear()
    }

    if (mMonth === currentMonth && mYear === currentYear) {
      if (cm.type === 'income') income += Number(cm.amount)
      if (cm.type === 'expense') expense += Number(cm.amount)
    }
  })

  const balance = income - expense

  const summaryCards = [
    {
      label: 'Pedidos do mês',
      value: monthlyOrders.length.toString(),
      sub: monthlyOrders.length === 0 ? 'Nenhum pedido ainda' : `${orders.length} pedidos no total`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Entradas recebidas',
      value: formatCurrency(income),
      sub: 'Este mês no caixa',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
      ),
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Saídas & Despesas',
      value: formatCurrency(expense),
      sub: 'Este mês no caixa',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
        </svg>
      ),
      color: 'bg-red-50 text-red-500',
    },
    {
      label: 'Saldo do Caixa',
      value: formatCurrency(balance),
      sub: 'Posição do mês atual',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      color: 'bg-indigo-50 text-indigo-600',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Olá, {firstName} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm flex items-center gap-1.5">
            <span>Visão geral de</span>
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
              {storeName}
            </span>
          </p>
        </div>
        <Link
          href="/dashboard/pedidos/novo"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo pedido
        </Link>
      </div>

      {/* Notification / PWA Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm">Alertas no Celular & Computador (PWA)</h3>
            <p className="text-xs text-indigo-100 mt-0.5">
              Receba o resumo diário da sua agenda e encomendas do dia direto no seu dispositivo.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/configuracoes"
          className="px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-xs"
        >
          Ativar Notificações
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-xs"
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{card.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col gap-1 p-4 bg-white rounded-xl border transition-all ${link.color}`}
            >
              <span className="font-semibold text-slate-800 text-sm">{link.label}</span>
              <span className="text-xs text-slate-500">{link.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent movements and upcoming orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Últimas Movimentações</h2>
            <Link href="/dashboard/caixa" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Ver caixa completo →
            </Link>
          </div>
          {cashMovements.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">Nenhuma movimentação recente no caixa.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cashMovements.slice(0, 5).map((m: any) => (
                <div key={m.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(m.movement_date)}</p>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ${m.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Próximos Pedidos & Entregas</h2>
            <Link href="/dashboard/pedidos" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Ver todos os pedidos →
            </Link>
          </div>
          {orders.filter((o: any) => o.status !== 'cancelled' && o.status !== 'completed').length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">Nenhum pedido pendente ou em produção.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders
                .filter((o: any) => o.status !== 'cancelled' && o.status !== 'completed')
                .slice(0, 5)
                .map((o: any) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/pedidos/${o.id}`}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors block"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{o.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {o.client_name} • {o.event_date ? formatDate(o.event_date) : 'Data a definir'}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-800 flex-shrink-0">
                      {formatCurrency(o.total_amount)}
                    </span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
