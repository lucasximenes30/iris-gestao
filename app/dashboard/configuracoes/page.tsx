import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getActiveStore } from '@/lib/db/stores'
import { SettingsForm } from './settings-form'
import { PushNotificationCard } from '@/components/push-notification-card'

export const metadata = {
  title: 'Configurações da Loja | Iris Gestão',
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const active = await getActiveStore()

  if (!active?.store) {
    return (
      <div className="p-8 text-center text-slate-500">
        Nenhuma loja encontrada para este usuário.
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Configurações da Loja
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie o nome comercial, contatos, fuso horário e notificações no celular/computador.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsForm store={active.store} role={active.role} />
        
        <PushNotificationCard storeId={active.store.id} />
      </div>
    </div>
  )
}
