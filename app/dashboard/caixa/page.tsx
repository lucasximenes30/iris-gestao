import { getCashMovements } from '@/lib/db/cash-movements'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import { PAYMENT_METHOD_OPTIONS } from '@/lib/constants'

export default async function CaixaPage() {
  let movements = []
  
  try {
    movements = await getCashMovements() || []
  } catch (err) {
    console.error(err)
  }

  let totalIncome = 0
  let totalExpense = 0

  movements.forEach((m: any) => {
    if (m.type === 'income') totalIncome += Number(m.amount)
    if (m.type === 'expense') totalExpense += Number(m.amount)
  })

  const balance = totalIncome - totalExpense

  const getMethodLabel = (val: string) => PAYMENT_METHOD_OPTIONS.find(opt => opt.value === val)?.label || val

  const getSourceLabel = (val: string) => {
    switch (val) {
      case 'payment': return 'Pagamento de Pedido'
      case 'expense': return 'Despesa Lançada'
      case 'manual': return 'Entrada Manual'
      default: return val
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Caixa</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Acompanhe o fluxo de entradas e saídas em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5">
          <p className="text-sm font-medium text-emerald-600">Entradas Totais</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-5">
          <p className="text-sm font-medium text-red-600">Saídas Totais</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
          <p className="text-sm font-medium text-indigo-600">Saldo Final</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Movimentações</h2>
        </div>
        
        {movements.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-600">O caixa está vazio</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Pagamentos de pedidos e despesas aparecerão aqui automaticamente.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {movements.map((m: any) => (
              <div key={m.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{m.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                    <span className="font-medium">{formatDateTime(m.movement_date)}</span>
                    <span>•</span>
                    <span>{getMethodLabel(m.payment_method)}</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{getSourceLabel(m.source)}</span>
                  </div>
                </div>
                <div className={`text-lg font-bold ${m.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
