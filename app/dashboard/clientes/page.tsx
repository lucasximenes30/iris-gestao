import { getActiveStore } from '@/lib/db/stores'
import { getClients, type Client } from '@/lib/db/clients'
import ClientListClient from './client-list-client'

export default async function ClientesPage() {
  let clients: Client[] = []
  try {
    const active = await getActiveStore()
    if (active?.store?.id) {
      clients = await getClients(active.store.id)
    }
  } catch (err) {
    console.error('Erro ao listar clientes:', err)
  }

  return <ClientListClient initialClients={clients} />
}
