export default function CaixaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Caixa</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Acompanhe o fluxo de entradas e saídas em tempo real.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Caixa vazio</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            O caixa será alimentado automaticamente pelos pagamentos de pedidos e pelas despesas lançadas. Sem necessidade de lançamentos manuais duplos.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-600">
          Em breve — Etapa 2
        </span>
      </div>
    </div>
  )
}
