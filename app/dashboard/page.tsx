import { createClient } from '@/utils/supabase/server'

const summaryCards = [
  {
    label: 'Pedidos do mês',
    value: '—',
    sub: 'Nenhum pedido ainda',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: 'bg-violet-50 text-violet-600',
  },
  {
    label: 'Entradas',
    value: 'R$ 0,00',
    sub: 'Este mês',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ),
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Saídas',
    value: 'R$ 0,00',
    sub: 'Este mês',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    ),
    color: 'bg-red-50 text-red-500',
  },
  {
    label: 'Saldo',
    value: 'R$ 0,00',
    sub: 'Posição atual',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    color: 'bg-indigo-50 text-indigo-600',
  },
]

const quickLinks = [
  { href: '/dashboard/pedidos', label: 'Novo Pedido', desc: 'Registrar um pedido ou festa', color: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50' },
  { href: '/dashboard/despesas', label: 'Nova Despesa', desc: 'Lançar uma saída de caixa', color: 'border-red-200 hover:border-red-300 hover:bg-red-50' },
  { href: '/dashboard/relatorios', label: 'Ver Relatórios', desc: 'Analisar resultados financeiros', color: 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const firstName = user?.email?.split('@')[0] ?? 'Usuário'

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Olá, {firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Bem-vindo ao Agenda Caixa. Aqui está o resumo do seu negócio.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`flex flex-col gap-1 p-5 bg-white rounded-xl border-2 transition-colors ${link.color}`}
            >
              <span className="font-semibold text-slate-800 text-sm">{link.label}</span>
              <span className="text-xs text-slate-500">{link.desc}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-800">Etapa 1 concluída</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Autenticação e estrutura base configuradas. As próximas etapas trarão pedidos, pagamentos, despesas e caixa com movimentações automáticas.
          </p>
        </div>
      </div>
    </div>
  )
}
