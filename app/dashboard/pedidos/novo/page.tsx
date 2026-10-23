import Link from 'next/link'
import { getActiveStore } from '@/lib/db/stores'
import { getClients } from '@/lib/db/clients'
import { getProducts } from '@/lib/db/products'
import OrderForm from '../order-form'

export default async function NovoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const params = await searchParams
  const defaultClientId = params?.client_id

  let clients: any[] = []
  let products: any[] = []

  try {
    const active = await getActiveStore()
    if (active?.store?.id) {
      clients = await getClients(active.store.id)
      products = await getProducts(active.store.id, { activeOnly: true })
    }
  } catch (err) {
    console.error('Erro ao carregar dados para novo pedido:', err)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold text-slate-800">Novo Pedido</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Cadastre encomendas com produtos do catálogo, clientes e datas de entrega.
          </p>
        </div>
      </div>

      <OrderForm
        availableClients={clients}
        availableProducts={products}
        defaultClientId={defaultClientId}
      />
    </div>
  )
}
