import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { checkIsAdmin, getAdminStores, getAdminUsers } from '@/lib/db/admin'
import { AdminViewClient } from './admin-view-client'

export const metadata = {
  title: 'Administração Geral | Iris Gestão',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    redirect('/dashboard')
  }

  let stores: any[] = []
  let users: any[] = []

  try {
    const [storesRes, usersRes] = await Promise.all([
      getAdminStores(),
      getAdminUsers(),
    ])
    stores = storesRes
    users = usersRes
  } catch (err) {
    console.error('Erro ao carregar dados administrativos:', err)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <svg className="w-3.5 h-3.5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Super Administrador
            </span>
            <span className="text-xs text-slate-400">• Acesso exclusivo</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
            Painel Administrativo do Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie manualmente todas as lojas da plataforma, controle usuários e configure permissões de administradores.
          </p>
        </div>
      </div>

      {/* Main Admin Interactive View */}
      <AdminViewClient
        stores={stores}
        users={users}
        currentUserId={user.id}
      />
    </div>
  )
}
