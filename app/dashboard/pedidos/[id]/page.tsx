import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getOrderById } from '@/lib/db/orders'
import { getPaymentsByOrder } from '@/lib/db/payments'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '@/lib/constants'
import DeleteOrderButton from './delete-button'
import PaymentsManager from './payments-manager'

export default async function DetalhesPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let order
  let payments = []
  
  try {
    order = await getOrderById(id)
    payments = await getPaymentsByOrder(id)
  } catch (error) {
    redirect('/dashboard/pedidos')
  }

  if (!order) {
    redirect('/dashboard/pedidos')
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

  const receivedAmount = payments.reduce((acc, p) => acc + Number(p.amount), 0)
  const remainingAmount = order.total_amount - receivedAmount

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/pedidos"
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{order.title}</h1>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <p className="text-slate-500 mt-1 text-sm">Criado em {formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DeleteOrderButton id={order.id} />
          <Link
            href={`/dashboard/pedidos/${order.id}/editar`}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg text-sm transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-500">Valor Total</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {order.total_amount > 0 ? formatCurrency(order.total_amount) : <span className="text-lg text-slate-400">Não informado</span>}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5">
          <p className="text-sm font-medium text-emerald-600">Recebido</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(receivedAmount)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-amber-600">Restante</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {remainingAmount < 0 ? 'Pago a mais' : formatCurrency(remainingAmount)}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
              {getPaymentStatusLabel(order.payment_status)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados do Cliente */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Dados do Cliente</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Nome</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{order.client_name}</p>
            </div>
            {order.client_phone && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Telefone</p>
                <p className="text-sm text-slate-800 mt-1">{order.client_phone}</p>
              </div>
            )}
            {order.client_email && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">E-mail</p>
                <p className="text-sm text-slate-800 mt-1">{order.client_email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dados do Evento */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Detalhes do Evento</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Data</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{order.event_date ? formatDate(order.event_date) : 'A definir'}</p>
              </div>
              {order.event_time && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Horário</p>
                  <p className="text-sm text-slate-800 mt-1">{order.event_time}</p>
                </div>
              )}
            </div>
            {order.event_location && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Local</p>
                <p className="text-sm text-slate-800 mt-1">{order.event_location}</p>
              </div>
            )}
            {order.estimated_cost !== null && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Custo Estimado</p>
                <p className="text-sm text-slate-800 mt-1">{formatCurrency(order.estimated_cost)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800">Observações</h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
          </div>
        </div>
      )}

      {/* Pagamentos */}
      <PaymentsManager orderId={order.id} payments={payments} />
    </div>
  )
}
