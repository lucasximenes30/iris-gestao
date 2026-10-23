'use client'

import { useState, useEffect } from 'react'

interface PushNotificationCardProps {
  storeId: string
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationCard({ storeId }: PushNotificationCardProps) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setSupported(true)
      setPermission(Notification.permission)

      // Check if already subscribed
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true)
          }
        })
      })
    }
  }, [])

  async function handleSubscribe() {
    if (!vapidPublicKey) {
      setMessage({ text: 'Chave VAPID pública não configurada.', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setMessage({
          text: 'Permissão de notificação não foi concedida. Habilite nas configurações do navegador.',
          type: 'error',
        })
        setLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      const subJSON = sub.toJSON()

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          subscription: subJSON,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao registrar assinatura no servidor')
      }

      setIsSubscribed(true)
      setMessage({
        text: 'Notificações ativadas com sucesso neste dispositivo!',
        type: 'success',
      })
    } catch (err: any) {
      console.error(err)
      setMessage({ text: err.message || 'Erro ao ativar notificações.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsubscribe() {
    setLoading(true)
    setMessage(null)

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }

      setIsSubscribed(false)
      setMessage({ text: 'Notificações desativadas para este dispositivo.', type: 'info' })
    } catch (err: any) {
      console.error(err)
      setMessage({ text: err.message || 'Erro ao desativar notificações.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleTestNotification() {
    setLoading(true)
    setMessage(null)

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (!sub) {
        throw new Error('Nenhuma inscrição encontrada. Ative as notificações primeiro.')
      }

      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao enviar notificação de teste')
      }

      setMessage({
        text: 'Notificação de teste disparada! Confira na tela ou barra de notificações do seu celular/computador.',
        type: 'success',
      })
    } catch (err: any) {
      console.error(err)
      setMessage({ text: err.message || 'Erro ao disparar teste.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-amber-800 text-xs font-medium">
        Este navegador ou modo anônimo não suporta notificações Web Push. No iOS Safari, primeiro adicione o aplicativo à tela inicial (PWA) para habilitar suporte a notificações.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Notificações no Celular & Computador</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Receba alertas de encomendas do dia e lembretes de entregas mesmo com o app fechado.
            </p>
          </div>
        </div>

        <div>
          {isSubscribed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Ativo neste dispositivo
            </span>
          ) : permission === 'denied' ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              Bloqueado no navegador
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              Não ativado
            </span>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {!isSubscribed ? (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading || permission === 'denied'}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            {loading ? 'Ativando...' : 'Ativar Notificações'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={loading}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
            >
              {loading ? 'Disparando...' : 'Enviar Notificação de Teste'}
            </button>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={loading}
              className="px-3.5 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors"
            >
              Desativar
            </button>
          </>
        )}
      </div>

      {/* iOS Instructions Helper Card */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Dica para iPhone / iPad (iOS):
        </p>
        <p>
          No Safari, toque no botão <strong>Compartilhar (ícone com seta para cima)</strong> e escolha <strong>"Adicionar à Tela de Início"</strong>. Abra o app pelo ícone criado na tela inicial e clique em "Ativar Notificações" para receber avisos como um aplicativo nativo.
        </p>
      </div>
    </div>
  )
}
