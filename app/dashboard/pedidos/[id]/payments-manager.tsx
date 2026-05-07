'use client'

import { useState } from 'react'
import { PAYMENT_METHOD_OPTIONS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { createPaymentAction, updatePaymentAction, deletePaymentAction } from '../actions'

type Payment = {
  id: string
  order_id: string
  amount: number
  payment_date: string
  payment_method: string
  description: string
  notes?: string
}

export default function PaymentsManager({ orderId, payments }: { orderId: string, payments: Payment[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openNew = () => {
    setEditingPayment(null)
    setError(null)
    setIsOpen(true)
  }

  const openEdit = (p: Payment) => {
    setEditingPayment(p)
    setError(null)
    setIsOpen(true)
  }

  const openDelete = (p: Payment) => {
    setDeletingPayment(p)
    setError(null)
    setIsDeleteOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsDeleteOpen(false)
    setEditingPayment(null)
    setDeletingPayment(null)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.append('order_id', orderId)

    let result
    if (editingPayment) {
      result = await updatePaymentAction(editingPayment.id, formData)
    } else {
      result = await createPaymentAction(formData)
    }

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setLoading(false)
      handleClose()
    }
  }

  const handleDelete = async () => {
    if (!deletingPayment) return
    setLoading(true)
    setError(null)

    const result = await deletePaymentAction(deletingPayment.id, orderId)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setLoading(false)
      handleClose()
    }
  }

  const getMethodLabel = (val: string) => PAYMENT_METHOD_OPTIONS.find(m => m.value === val)?.label || val

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Pagamentos</h2>
        <button 
          onClick={openNew}
          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-lg transition-colors"
        >
          Adicionar pagamento
        </button>
      </div>
      
      {payments.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">Nenhum pagamento registrado</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Este pedido ainda não possui pagamentos registrados.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {payments.map(payment => (
            <div key={payment.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">{formatCurrency(payment.amount)}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="font-medium">{formatDate(payment.payment_date)}</span>
                  <span>•</span>
                  <span>{getMethodLabel(payment.payment_method)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">{payment.description}</p>
                {payment.notes && (
                  <p className="text-xs text-slate-400 mt-1 italic">{payment.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2 sm:self-start">
                <button
                  onClick={() => openEdit(payment)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  aria-label="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => openDelete(payment)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  aria-label="Excluir"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Valor Pago *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">R$</span>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue={editingPayment?.amount || ''}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payment_date" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Data *
                  </label>
                  <input
                    id="payment_date"
                    name="payment_date"
                    type="date"
                    required
                    defaultValue={editingPayment?.payment_date || new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="payment_method" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Forma de Pgto *
                  </label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    required
                    defaultValue={editingPayment?.payment_method || 'pix'}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {PAYMENT_METHOD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Referente a quê? *
                </label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  required
                  defaultValue={editingPayment?.description || 'Pagamento do pedido'}
                  placeholder="Ex: Sinal, Parcela 1..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Observações
                </label>
                <input
                  id="notes"
                  name="notes"
                  type="text"
                  defaultValue={editingPayment?.notes || ''}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800">Excluir Pagamento</h3>
            <p className="text-slate-500 mt-2 text-sm">
              Tem certeza que deseja excluir este pagamento? A entrada correspondente no caixa também será removida automaticamente.
            </p>
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors"
              >
                {loading ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
