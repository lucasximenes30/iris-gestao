import { getExpenses } from '@/lib/db/expenses'
import { getOrders } from '@/lib/db/orders'
import { getActiveStore } from '@/lib/db/stores'
import { ExpenseListClient } from './expense-list-client'

export const metadata = {
  title: 'Despesas & Gastos | Iris Gestão',
}

export default async function DespesasPage() {
  let storeId: string | undefined
  try {
    const active = await getActiveStore()
    storeId = active?.store?.id
  } catch (err) {
    console.error('Erro ao recuperar loja ativa em despesas:', err)
  }

  let expenses: any[] = []
  let orders: any[] = []

  try {
    const [expensesRes, ordersRes] = await Promise.all([
      getExpenses({ storeId }),
      getOrders({ storeId }),
    ])
    expenses = expensesRes || []
    orders = (ordersRes || []).map((o: any) => ({
      id: o.id,
      title: o.title || '',
      client_name: o.client_name || '',
    }))
  } catch (err) {
    console.error('Erro ao buscar dados de despesas:', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Despesas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Controle seus insumos, embalagens, transporte, custos fixos e saídas operacionais.
        </p>
      </div>

      <ExpenseListClient expenses={expenses} orders={orders} />
    </div>
  )
}
