import { getOrderById } from '@/lib/db/orders'
import { redirect } from 'next/navigation'
import EditOrderForm from './edit-form'

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let order
  
  try {
    order = await getOrderById(id)
  } catch (error) {
    redirect('/dashboard/pedidos')
  }

  if (!order) {
    redirect('/dashboard/pedidos')
  }

  return <EditOrderForm order={order} />
}
