export default function DespesasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Despesas</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Controle suas saídas e gastos operacionais.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Nenhuma despesa registrada</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Em breve você poderá lançar despesas com categoria, descrição e valor, que impactarão automaticamente o caixa.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
          Em breve — Etapa 2
        </span>
      </div>
    </div>
  )
}
