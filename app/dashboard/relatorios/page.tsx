import { getOrders } from '@/lib/db/orders'
import { getExpenses } from '@/lib/db/expenses'
import { getCashMovements } from '@/lib/db/cash-movements'
import { getActiveStore } from '@/lib/db/stores'
import { ReportsViewClient } from './reports-view-client'

export const metadata = {
  title: 'Relatórios Financeiros & Operacionais | Iris Gestão',
}

export default async function RelatoriosPage() {
  let storeId: string | undefined
  try {
    const active = await getActiveStore()
    storeId = active?.store?.id
  } catch (err) {
    console.error('Erro ao recuperar loja ativa em relatórios:', err)
  }

  let orders: any[] = []
  let expenses: any[] = []
  let movements: any[] = []

  try {
    const [ordersRes, expensesRes, movementsRes] = await Promise.all([
      getOrders({ storeId }),
      getExpenses({ storeId }),
      getCashMovements({ storeId }),
    ])
    orders = ordersRes || []
    expenses = expensesRes || []
    movements = movementsRes || []
  } catch (err) {
    console.error('Erro ao buscar dados para relatórios:', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Relatórios & Inteligência</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visão consolidada de faturamento, despesas por categoria, lucro operacional e indicadores de desempenho.
        </p>
      </div>

      <ReportsViewClient
        orders={orders}
        expenses={expenses}
        movements={movements}
      />
    </div>
  )
}
