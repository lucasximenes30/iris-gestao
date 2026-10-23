'use client'

import { useState } from 'react'
import { updateOrderStatusAction } from '../actions'

const PIPELINE_STEPS = [
  { key: 'pending_confirmation', label: 'Pendente', next: 'confirmed', nextLabel: 'Confirmar' },
  { key: 'confirmed', label: 'Confirmado', next: 'in_production', nextLabel: 'Iniciar Produção' },
  { key: 'in_production', label: 'Em Produção', next: 'ready', nextLabel: 'Pronto p/ Entrega' },
  { key: 'ready', label: 'Pronto', next: 'completed', nextLabel: 'Marcar como Entregue' },
  { key: 'completed', label: 'Entregue / Concluído', next: null, nextLabel: null },
]

export default function OrderStatusStepper({
  orderId,
  currentStatus
}: {
  orderId: string
  currentStatus: string
}) {
  const [loading, setLoading] = useState(false)
  const isCancelled = currentStatus === 'cancelled'
  const isDraft = currentStatus === 'draft'

  // Normaliza o status legado 'scheduled' para 'confirmed'
  const normalizedStatus = currentStatus === 'scheduled' ? 'confirmed' : currentStatus

  const currentStepIndex = PIPELINE_STEPS.findIndex(s => s.key === normalizedStatus)
  const currentStep = PIPELINE_STEPS[currentStepIndex]

  const handleAdvance = async (newStatus: string) => {
    setLoading(true)
    await updateOrderStatusAction(orderId, newStatus)
    setLoading(false)
  }

  if (isCancelled) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
            ✕
          </div>
          <div>
            <p className="font-bold text-red-900 text-sm">Pedido Cancelado</p>
            <p className="text-xs text-red-700">Este pedido foi cancelado e não conta nas vendas concluídas.</p>
          </div>
        </div>
        <button
          onClick={() => handleAdvance('confirmed')}
          disabled={loading}
          className="text-xs font-semibold text-red-700 hover:text-red-900 bg-white border border-red-300 px-3 py-1.5 rounded-lg shadow-xs"
        >
          {loading ? 'Reativando...' : 'Reativar pedido'}
        </button>
      </div>
    )
  }

  if (isDraft) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-slate-800 text-sm">Pedido em Rascunho</p>
          <p className="text-xs text-slate-500">Preencha os dados e confirme a encomenda com o cliente.</p>
        </div>
        <button
          onClick={() => handleAdvance('confirmed')}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          {loading ? 'Confirmando...' : 'Confirmar encomenda'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Etapa da Produção & Entrega
        </h3>
        
        {normalizedStatus !== 'completed' && (
          <button
            onClick={() => handleAdvance('cancelled')}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-red-600 transition-colors"
          >
            Cancelar pedido
          </button>
        )}
      </div>

      {/* Pipeline Progress Bar */}
      <div className="relative">
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100">
          <div
            style={{ width: `${Math.max(10, ((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100)}%` }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-300 ${
              normalizedStatus === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'
            }`}
          />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-5 gap-1 text-center">
          {PIPELINE_STEPS.map((step, idx) => {
            const isPassed = currentStepIndex > idx
            const isCurrent = currentStepIndex === idx

            return (
              <div key={step.key} className="flex flex-col items-center">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : isPassed
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isPassed ? '✓' : idx + 1}
                </span>
                <span
                  className={`text-[11px] leading-tight font-medium ${
                    isCurrent ? 'text-indigo-900 font-bold' : isPassed ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Advance Action Button */}
      {currentStep?.next && currentStep.nextLabel && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={() => handleAdvance(currentStep.next!)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            {loading ? 'Atualizando...' : `Avançar: ${currentStep.nextLabel} →`}
          </button>
        </div>
      )}
    </div>
  )
}
