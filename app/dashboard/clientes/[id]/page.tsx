import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getActiveStore } from '@/lib/db/stores'
import { getClientWithOrders } from '@/lib/db/clients'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '@/lib/constants'

export default async function DetalhesClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const active = await getActiveStore()
  if (!active?.store?.id) {
    redirect('/login')
  }

  let clientWithOrders
  try {
    clientWithOrders = await getClientWithOrders(id, active.store.id)
  } catch (err) {
    notFound()
  }

  if (!clientWithOrders) {
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

  const cleanPhone = clientWithOrders.phone ? clientWithOrders.phone.replace(/\D/g, '') : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/clientes"
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{clientWithOrders.name}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Cliente cadastrado em {formatDate(clientWithOrders.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {cleanPhone && (
            <a
              href={`https://wa.me/55${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-sm rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
              WhatsApp
            </a>
          )}
          <Link
            href={`/dashboard/pedidos/novo?client_id=${clientWithOrders.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-xs"
          >
            Novo pedido
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total de Pedidos</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {clientWithOrders.orders.length}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 shadow-xs">
          <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Total Comprado</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">
            {formatCurrency(clientWithOrders.totalPurchased)}
          </p>
        </div>
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 shadow-xs">
          <p className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Ticket Médio</p>
          <p className="text-2xl font-bold text-indigo-800 mt-1">
            {clientWithOrders.orders.length > 0
              ? formatCurrency(clientWithOrders.totalPurchased / clientWithOrders.orders.length)
              : formatCurrency(0)}
          </p>
        </div>
      </div>

      {/* Contact Info & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800 text-sm">Dados de Contato</h2>
          </div>
          <div className="p-5 space-y-3.5 text-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Telefone / WhatsApp</p>
              <p className="text-slate-800 font-medium mt-0.5">{clientWithOrders.phone || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">E-mail</p>
              <p className="text-slate-800 font-medium mt-0.5">{clientWithOrders.email || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Endereço de Entrega</p>
              <p className="text-slate-800 font-medium mt-0.5">{clientWithOrders.address || 'Não informado'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800 text-sm">Observações & Preferências</h2>
          </div>
          <div className="p-5">
            {clientWithOrders.notes ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{clientWithOrders.notes}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhuma observação ou preferência registrada para este cliente.</p>
            )}
          </div>
        </div>
      </div>

      {/* Orders History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Histórico de Pedidos</h2>
          <span className="text-xs text-slate-400 font-medium">
            {clientWithOrders.orders.length} pedidos encontrados
          </span>
        </div>

        {clientWithOrders.orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">Este cliente ainda não realizou nenhum pedido registrado.</p>
            <Link
              href={`/dashboard/pedidos/novo?client_id=${clientWithOrders.id}`}
              className="mt-3 inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
            >
              Criar primeiro pedido
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {clientWithOrders.orders.map((o: any) => (
              <div key={o.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusColor(o.status)}`}>
                      {getStatusLabel(o.status)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getPaymentStatusColor(o.payment_status)}`}>
                      {getPaymentStatusLabel(o.payment_status)}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">{o.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Data do evento: <span className="font-medium text-slate-700">{o.event_date ? formatDate(o.event_date) : 'A definir'}</span>
                  </p>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-3">
                  <p className="text-base font-bold text-slate-800">
                    {formatCurrency(o.total_amount)}
                  </p>
                  <Link
                    href={`/dashboard/pedidos/${o.id}`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Ver pedido →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
