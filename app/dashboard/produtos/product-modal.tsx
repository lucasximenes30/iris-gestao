'use client'

import { useState } from 'react'
import { createProductAction, updateProductAction } from './actions'
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '@/lib/constants'
import type { Product } from '@/lib/db/products'

interface ProductModalProps {
  product?: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (savedProduct?: any) => void
}

export default function ProductModal({ product, isOpen, onClose, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    let res
    if (product) {
      res = await updateProductAction(product.id, formData)
    } else {
      res = await createProductAction(formData)
    }

    if (res?.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setLoading(false)
      onClose()
      if (onSuccess) onSuccess(res?.product)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {product ? 'Editar Produto / Doce' : 'Novo Produto / Doce'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="product-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome do doce ou produto *
            </label>
            <input
              id="product-name"
              name="name"
              type="text"
              required
              defaultValue={product?.name || ''}
              placeholder="Ex: Bolo Vulcão Ninho c/ Nutella, Cento de Brigadeiros..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="product-category" className="block text-sm font-medium text-slate-700 mb-1.5">
                Categoria *
              </label>
              <select
                id="product-category"
                name="category"
                defaultValue={product?.category || 'bolos'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {PRODUCT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product-unit" className="block text-sm font-medium text-slate-700 mb-1.5">
                Unidade de venda *
              </label>
              <select
                id="product-unit"
                name="unit"
                defaultValue={product?.unit || 'un'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {PRODUCT_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="product-price" className="block text-sm font-medium text-slate-700 mb-1.5">
                Preço de Venda (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-medium">R$</span>
                <input
                  id="product-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={product?.price ?? ''}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="product-cost-price" className="block text-sm font-medium text-slate-700 mb-1.5">
                Custo Estimado (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-medium">R$</span>
                <input
                  id="product-cost-price"
                  name="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.cost_price ?? ''}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="product-description" className="block text-sm font-medium text-slate-700 mb-1.5">
              Descrição & Sabores
            </label>
            <textarea
              id="product-description"
              name="description"
              rows={3}
              defaultValue={product?.description || ''}
              placeholder="Ingredientes principais, rendimento (ex: serve 15 pessoas), sabores disponíveis..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="product-active"
              name="is_active"
              type="checkbox"
              defaultChecked={product ? product.is_active : true}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="product-active" className="text-sm font-medium text-slate-700 select-none">
              Item ativo e disponível para pedidos
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
