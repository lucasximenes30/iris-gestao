import { getOrders, type Order } from '@/lib/db/orders'
import { getActiveStore } from '@/lib/db/stores'
import OrdersViewClient from './orders-view-client'

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; payment_status?: string }>
}) {
  const params = await searchParams
  const search = params.search || ''
  const status = params.status || ''
  const payment_status = params.payment_status || ''

  let activeStore = null
  try {
    activeStore = await getActiveStore()
  } catch (err) {
    console.error('Erro ao buscar loja ativa em pedidos:', err)
  }
  const storeId = activeStore?.store?.id

  let orders: Order[] = []
  try {
    orders = await getOrders({ storeId, search, status, payment_status }) || []
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err)
  }

  return (
    <OrdersViewClient
      initialOrders={orders}
      initialSearch={search}
      initialStatus={status}
      initialPaymentStatus={payment_status}
    />
  )
}
