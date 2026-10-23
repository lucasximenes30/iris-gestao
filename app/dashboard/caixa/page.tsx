import { getCashMovements, type CashMovement } from '@/lib/db/cash-movements'
import { getActiveStore } from '@/lib/db/stores'
import { CaixaViewClient } from './caixa-view-client'

export const metadata = {
  title: 'Fluxo de Caixa | Iris Gestão',
}

export default async function CaixaPage() {
  let storeId: string | undefined
  try {
    const activeStore = await getActiveStore()
    storeId = activeStore?.store?.id
  } catch (err) {
    console.error('Erro ao recuperar loja ativa no caixa:', err)
  }

  let movements: CashMovement[] = []
  try {
    movements = (await getCashMovements({ storeId })) || []
  } catch (err) {
    console.error('Erro ao buscar movimentações de caixa:', err)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fluxo de Caixa</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe entradas automáticas de pedidos, saídas de despesas e realize lançamentos manuais.
        </p>
      </div>

      <CaixaViewClient initialMovements={movements} />
    </div>
  )
}
