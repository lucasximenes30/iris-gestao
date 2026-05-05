export default function PedidosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pedidos</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Gerencie seus pedidos, festas e eventos.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Nenhum pedido ainda</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Em breve você poderá registrar pedidos com dados do cliente, data do evento e status de pagamento.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
          Em breve — Etapa 2
        </span>
      </div>
    </div>
  )
}
