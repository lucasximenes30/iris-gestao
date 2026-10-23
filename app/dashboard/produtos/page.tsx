import { getActiveStore } from '@/lib/db/stores'
import { getProducts, type Product } from '@/lib/db/products'
import ProductListClient from './product-list-client'

export default async function ProdutosPage() {
  let products: Product[] = []
  try {
    const active = await getActiveStore()
    if (active?.store?.id) {
      products = await getProducts(active.store.id)
    }
  } catch (err) {
    console.error('Erro ao listar produtos:', err)
  }

  return <ProductListClient initialProducts={products} />
}
