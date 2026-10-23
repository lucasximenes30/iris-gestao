'use client'

import { useState, useMemo } from 'react'
import ProductModal from './product-modal'
import { deleteProductAction, toggleProductActiveAction } from './actions'
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'
import type { Product } from '@/lib/db/products'

interface ProductListClientProps {
  initialProducts: Product[]
}

export default function ProductListClient({ initialProducts }: ProductListClientProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('todos')
  const [activeOnly, setActiveOnly] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredProducts = useMemo(() => {
    return initialProducts.filter(p => {
      if (activeOnly && !p.is_active) return false
      if (selectedCategory !== 'todos' && p.category !== selectedCategory) return false
      if (search.trim()) {
        const term = search.toLowerCase()
        const matchesName = p.name.toLowerCase().includes(term)
        const matchesDesc = p.description?.toLowerCase().includes(term)
        if (!matchesName && !matchesDesc) return false
      }
      return true
    })
  }, [initialProducts, search, selectedCategory, activeOnly])

  const openNew = () => {
    setSelectedProduct(null)
    setModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setSelectedProduct(product)
    setModalOpen(true)
  }

  const handleToggleActive = async (p: Product) => {
    await toggleProductActiveAction(p.id, !p.is_active)
  }

  const handleDelete = async () => {
    if (!deleteProduct) return
    setDeleting(true)
    await deleteProductAction(deleteProduct.id)
    setDeleting(false)
    setDeleteProduct(null)
  }

  const getCategoryLabel = (cat: string) =>
    PRODUCT_CATEGORIES.find(c => c.value === cat)?.label || cat

  const getUnitLabel = (u: string) =>
    PRODUCT_UNITS.find(unit => unit.value === u)?.label || u

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Produtos</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Doces, bolos, salgados e kits para usar nos seus pedidos e encomendas.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors self-start sm:self-auto shadow-xs"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo produto
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <svg className="w-5 h-5 absolute left-3.5 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar doce ou produto..."
              className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            Apenas itens disponíveis
          </label>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs">
          <button
            onClick={() => setSelectedCategory('todos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              selectedCategory === 'todos'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({initialProducts.length})
          </button>
          {PRODUCT_CATEGORIES.map(cat => {
            const count = initialProducts.filter(p => p.category === cat.value).length
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  selectedCategory === cat.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label} {count > 0 && `(${count})`}
              </button>
            )
          })}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Nenhum produto encontrado</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {search || selectedCategory !== 'todos' || activeOnly
                ? 'Nenhum resultado para os filtros selecionados.'
                : 'Cadastre os doces e bolos que você vende para facilitar a criação de novos pedidos.'}
            </p>
          </div>
          {!search && selectedCategory === 'todos' && (
            <button
              onClick={openNew}
              className="mt-2 inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors text-sm"
            >
              Cadastrar primeiro produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const hasCost = p.cost_price !== null && p.cost_price > 0
            const margin = hasCost ? p.price - (p.cost_price || 0) : null

            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border p-5 flex flex-col justify-between hover:shadow-md transition-all ${
                  p.is_active ? 'border-slate-200' : 'border-slate-200/60 opacity-65 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-semibold">
                      {getCategoryLabel(p.category)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Editar produto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteProduct(p)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Excluir produto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base leading-snug">
                    {p.name}
                  </h3>

                  {p.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Preço de venda</p>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(p.price)}
                        <span className="text-xs font-normal text-slate-500 ml-1">
                          / {getUnitLabel(p.unit)}
                        </span>
                      </p>
                    </div>

                    {margin !== null && (
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400 font-medium">Margem estimada</p>
                        <p className="text-sm font-semibold text-emerald-600">
                          +{formatCurrency(margin)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-xs font-medium flex items-center gap-1.5 ${
                    p.is_active ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {p.is_active ? 'Disponível' : 'Pausado'}
                  </span>

                  <button
                    onClick={() => handleToggleActive(p)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {p.is_active ? 'Pausar venda' : 'Ativar venda'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar */}
      <ProductModal
        isOpen={modalOpen}
        product={selectedProduct}
        onClose={() => setModalOpen(false)}
      />

      {/* Modal Confirmar Exclusão */}
      {deleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-800">Excluir Produto</h3>
            <p className="text-slate-500 mt-2 text-sm">
              Tem certeza que deseja excluir <strong>{deleteProduct.name}</strong>? Pedidos antigos com este item manterão o histórico inalterado.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteProduct(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors"
              >
                {deleting ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
