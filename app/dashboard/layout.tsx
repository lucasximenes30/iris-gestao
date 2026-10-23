import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getActiveStore } from '@/lib/db/stores'
import { checkIsAdmin } from '@/lib/db/admin'
import { Sidebar, MobileHeader } from '@/components/sidebar'
import { PwaAssistant } from '@/components/pwa-assistant'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let storeName = 'Minha Loja'
  let storeId = ''
  try {
    const active = await getActiveStore()
    if (active?.store?.name) {
      storeName = active.store.name
      storeId = active.store.id
    }
  } catch (err) {
    console.error('Erro ao recuperar loja ativa no layout:', err)
  }

  let isAdmin = false
  try {
    isAdmin = await checkIsAdmin()
  } catch (err) {
    console.error('Erro ao verificar status de admin:', err)
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar userEmail={user.email} storeName={storeName} isAdmin={isAdmin} />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile Header */}
        <MobileHeader userEmail={user.email} storeName={storeName} isAdmin={isAdmin} />

        {/* PWA & Push Notification Assistant */}
        <PwaAssistant storeId={storeId} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
