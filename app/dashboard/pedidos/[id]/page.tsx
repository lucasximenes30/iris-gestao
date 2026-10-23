import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getOrderById } from '@/lib/db/orders'
import { getPaymentsByOrder } from '@/lib/db/payments'
import { formatCurrency, formatDate, formatDateWithWeekday } from '@/lib/formatters'
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '@/lib/constants'
import DeleteOrderButton from './delete-button'
import PaymentsManager from './payments-manager'
import OrderStatusStepper from './order-status-stepper'

export default async function DetalhesPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let order: any
  let payments = []
  
  try {
    order = await getOrderById(id)
    payments = await getPaymentsByOrder(id)
  } catch (error) {
    redirect('/dashboard/pedidos')
  }

  if (!order) {
    notFound()
  }

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

  const receivedAmount = payments.reduce((acc, p) => acc + Number(p.amount), 0)
  const remainingAmount = order.total_amount - receivedAmount
  const cleanPhone = order.client_phone ? order.client_phone.replace(/\D/g, '') : null

  // Texto do recibo para copiar e enviar no WhatsApp
  const receiptText = encodeURIComponent(
    `*COMPROVANTE DE ENCOMENDA — ${order.title}*\n` +
    `👤 Cliente: ${order.client_name}\n` +
    `📅 Data Prevista: ${order.event_date ? formatDate(order.event_date) : 'A combinar'} ${order.event_time ? 'às ' + order.event_time : ''}\n` +
    `📦 Modalidade: ${order.delivery_type === 'delivery' ? 'Entrega em ' + (order.delivery_address || 'endereço combinado') : 'Retirada no local'}\n\n` +
    `💰 Valor Total: ${formatCurrency(order.total_amount)}\n` +
    `✅ Já Pago: ${formatCurrency(receivedAmount)}\n` +
    `⏳ Saldo a Pagar: ${remainingAmount > 0 ? formatCurrency(remainingAmount) : 'R$ 0,00 (Quitado)'}\n\n` +
    `Obrigado pela preferência!`
  )

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

        <div className="flex items-center gap-2">
          {cleanPhone && (
            <a
              href={`https://wa.me/55${cleanPhone}?text=${receiptText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg transition-colors"
              title="Enviar resumo do pedido no WhatsApp"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
              Enviar Recibo
            </a>
          )}
          <Link
            href={`/dashboard/pedidos/${order.id}/editar`}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg text-xs transition-colors shadow-xs"
          >
            Editar
          </Link>
          <DeleteOrderButton id={order.id} />
        </div>
      </div>

      {/* Pipeline Status Stepper */}
      <OrderStatusStepper orderId={order.id} currentStatus={order.status} />

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Valor Total</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {order.total_amount > 0 ? formatCurrency(order.total_amount) : <span className="text-lg text-slate-400">Não informado</span>}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Recebido no Caixa</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(receivedAmount)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Saldo a Receber</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">
                {remainingAmount < 0 ? 'Pago a mais' : formatCurrency(remainingAmount)}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getPaymentStatusColor(order.payment_status)}`}>
              {getPaymentStatusLabel(order.payment_status)}
            </span>
          </div>
        </div>
      </div>

      {/* PRODUTOS / ITENS DO PEDIDO */}
      {order.order_items && order.order_items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">Produtos & Sabores da Encomenda</h2>
            <span className="text-xs text-slate-400">
              {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {order.order_items.map((item: any) => (
              <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      x{item.quantity}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-slate-500 italic bg-amber-50/50 p-1.5 rounded border border-amber-100/50">
                      Sabores / Obs: {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex sm:flex-col sm:items-end justify-between text-xs text-slate-500">
                  <span>Unit: {formatCurrency(item.unit_price)}</span>
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(item.total_price)}</span>
                </div>
              </div>
            ))}
          </div>

          {(order.delivery_fee > 0 || order.discount_amount > 0) && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col items-end gap-1 text-xs text-slate-600">
              {order.delivery_fee > 0 && (
                <div>Taxa de entrega: <span className="font-semibold text-slate-800">+{formatCurrency(order.delivery_fee)}</span></div>
              )}
              {order.discount_amount > 0 && (
                <div>Desconto aplicado: <span className="font-semibold text-red-600">-{formatCurrency(order.discount_amount)}</span></div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados do Cliente */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">Dados do Cliente</h2>
            {order.client_id && (
              <Link
                href={`/dashboard/clientes/${order.client_id}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Ver histórico do cliente →
              </Link>
            )}
          </div>
          <div className="p-5 space-y-3.5 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Nome</p>
              <p className="font-bold text-slate-800 mt-0.5">{order.client_name}</p>
            </div>
            {order.client_phone && (
              <div>
                <p className="text-xs text-slate-400 font-medium">Telefone / WhatsApp</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-slate-800 font-medium">{order.client_phone}</span>
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Abrir conversa ↗
                    </a>
                  )}
                </div>
              </div>
            )}
            {order.client_email && (
              <div>
                <p className="text-xs text-slate-400 font-medium">E-mail</p>
                <p className="text-slate-800 mt-0.5">{order.client_email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dados da Entrega / Retirada */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">Data, Horário & Envio</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              order.delivery_type === 'delivery' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {order.delivery_type === 'delivery' ? 'Entrega no Endereço' : 'Retirada no Local'}
            </span>
          </div>
          <div className="p-5 space-y-3.5 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 font-medium">Data Prevista</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {order.event_date ? formatDateWithWeekday(order.event_date) : 'A definir'}
                </p>
              </div>
              {order.event_time && (
                <div>
                  <p className="text-xs text-slate-400 font-medium">Horário</p>
                  <p className="font-bold text-slate-800 mt-0.5">{order.event_time}</p>
                </div>
              )}
            </div>

            {order.delivery_type === 'delivery' && order.delivery_address && (
              <div>
                <p className="text-xs text-slate-400 font-medium">Endereço de Entrega</p>
                <p className="text-slate-800 mt-0.5">{order.delivery_address}</p>
              </div>
            )}

            {order.delivery_type !== 'delivery' && order.event_location && (
              <div>
                <p className="text-xs text-slate-400 font-medium">Local de Retirada</p>
                <p className="text-slate-800 mt-0.5">{order.event_location}</p>
              </div>
            )}

            {order.estimated_cost !== null && (
              <div>
                <p className="text-xs text-slate-400 font-medium">Custo Estimado dos Ingredientes</p>
                <p className="text-slate-800 mt-0.5 font-medium">{formatCurrency(order.estimated_cost)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800 text-sm">Observações Gerais</h2>
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
