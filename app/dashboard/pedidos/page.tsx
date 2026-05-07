import Link from 'next/link'
import { getOrders } from '@/lib/db/orders'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '@/lib/constants'

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; payment_status?: string }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const status = params.status || ''
  const payment_status = params.payment_status || ''

  let orders = []
  try {
    orders = await getOrders({ search, status, payment_status }) || []
  } catch (err) {
    console.error(err)
  }

  const getStatusLabel = (val: string) => ORDER_STATUS_OPTIONS.find(o => o.value === val)?.label || val
  const getPaymentStatusLabel = (val: string) => PAYMENT_STATUS_OPTIONS.find(o => o.value === val)?.label || val

  const getStatusColor = (val: string) => {
    switch (val) {
      case 'draft': return 'bg-slate-100 text-slate-700'
      case 'scheduled': return 'bg-blue-100 text-blue-700'
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pedidos</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Gerencie seus pedidos, festas e eventos.
          </p>
        </div>
        <Link
          href="/dashboard/pedidos/novo"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo pedido
        </Link>
      </div>

      {/* Filters (Basic implementation using form) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <form className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Buscar por cliente ou título..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            name="status"
            defaultValue={status}
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todos os status</option>
            {ORDER_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            name="payment_status"
            defaultValue={payment_status}
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todos os pagamentos</option>
            {PAYMENT_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors"
          >
            Filtrar
          </button>
          {(search || status || payment_status) && (
            <Link
              href="/dashboard/pedidos"
              className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center transition-colors"
            >
              Limpar
            </Link>
          )}
        </form>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Nenhum pedido encontrado</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {search || status || payment_status 
                ? 'Tente mudar os filtros de busca para encontrar o que procura.' 
                : 'Registre seu primeiro pedido para acompanhar pagamentos, datas e valores.'}
            </p>
          </div>
          {!(search || status || payment_status) && (
            <Link
              href="/dashboard/pedidos/novo"
              className="mt-2 inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
            >
              Criar primeiro pedido
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                  {getPaymentStatusLabel(order.payment_status)}
                </span>
              </div>
              
              <h3 className="font-semibold text-slate-800 text-lg leading-tight line-clamp-1">
                {order.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {order.client_name}
              </p>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Data do evento:</span>
                  <span className="font-medium text-slate-700">
                    {order.event_date ? formatDate(order.event_date) : <span className="text-slate-400">A definir</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Valor total:</span>
                  <span className="font-semibold text-slate-800">
                    {order.total_amount > 0 ? formatCurrency(order.total_amount) : <span className="text-slate-400 font-normal">A definir</span>}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <Link
                  href={`/dashboard/pedidos/${order.id}`}
                  className="flex-1 text-center py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Ver detalhes
                </Link>
                <Link
                  href={`/dashboard/pedidos/${order.id}/editar`}
                  className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  aria-label="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
