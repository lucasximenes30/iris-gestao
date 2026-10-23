'use client'

import { useState, useEffect } from 'react'

interface PwaAssistantProps {
  storeId?: string
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

export function PwaAssistant({ storeId }: PwaAssistantProps) {
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  
  // Notification States
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Modal / UI States
  const [isOpen, setIsOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Detect Standalone (Already installed PWA)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    setIsStandalone(standalone)

    // 2. Detect OS
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const android = /android/.test(ua)
    setIsIOS(ios)
    setIsAndroid(android)

    // 3. Capture beforeinstallprompt for Android / Desktop Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 4. Check Push Notification Support
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setSupported(true)
      setPermission(Notification.permission)

      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true)
          }
        })
      })
    }

    // Check localStorage for dismissal preference
    const dismissed = localStorage.getItem('iris_pwa_banner_dismissed') === 'true'
    setBannerDismissed(dismissed)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Android Native 1-Click Install
  async function handleNativeInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }
  }

  // Subscribe to Web Push
  async function handleSubscribe() {
    if (!vapidPublicKey) {
      setFeedback('Chave VAPID pública não encontrada no ambiente.')
      return
    }

    if (!storeId) {
      setFeedback('Identificador da loja não encontrado.')
      return
    }

    setLoading(true)
    setFeedback(null)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setFeedback('Permissão não concedida. Habilite as notificações nas configurações do seu navegador.')
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

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          subscription: sub.toJSON(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao registrar notificação no servidor')
      }

      setIsSubscribed(true)
      setFeedback('✅ Notificações ativadas com sucesso neste celular!')
    } catch (err: any) {
      console.error(err)
      setFeedback(err.message || 'Erro ao ativar notificações.')
    } finally {
      setLoading(false)
    }
  }

  // Test Push Notification
  async function handleTestNotification() {
    setLoading(true)
    setFeedback(null)
    setTestSuccess(false)

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
        throw new Error(data.error || 'Erro ao disparar teste')
      }

      setTestSuccess(true)
      setFeedback('🎉 Notificação de teste enviada! Seu celular deve vibrar/tocar agora mesmo!')
    } catch (err: any) {
      console.error(err)
      setFeedback(err.message || 'Erro ao disparar notificação de teste.')
    } finally {
      setLoading(false)
    }
  }

  function dismissBanner() {
    setBannerDismissed(true)
    localStorage.setItem('iris_pwa_banner_dismissed', 'true')
  }

  return (
    <>
      {/* 1. TOP MOBILE BANNER (Shown if not installed OR not subscribed) */}
      {!bannerDismissed && (!isStandalone || !isSubscribed) && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white px-4 py-3 shadow-md border-b border-indigo-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-white shadow-inner">
                {!isStandalone ? (
                  <svg className="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                )}
              </div>
              <div className="text-xs">
                {!isStandalone ? (
                  <>
                    <p className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                      Instale o Iris Gestão no seu celular
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/50 text-indigo-100 uppercase font-semibold">
                        {isIOS ? 'iPhone' : isAndroid ? 'Android' : 'App'}
                      </span>
                    </p>
                    <p className="text-indigo-200 mt-0.5">
                      Adicione à tela inicial para usar como aplicativo nativo e receber notificações matinais às 07:30.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                      Ative as Notificações Matinais (07:30)
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/40 text-amber-200 uppercase font-semibold">
                        Pendente
                      </span>
                    </p>
                    <p className="text-indigo-200 mt-0.5">
                      Receba o resumo automático das encomendas do dia no seu dispositivo.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-3.5 py-1.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                {!isStandalone ? 'Ver Como Instalar' : 'Ativar Notificações'}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={dismissBanner}
                className="p-1.5 text-indigo-300 hover:text-white rounded-lg hover:bg-white/10"
                aria-label="Dispensar banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FLOATING TRIGGER BUTTON (Only shown while NOT installed or NOT subscribed) */}
      {(!isStandalone || !isSubscribed) && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg border border-indigo-500/40 flex items-center gap-2 text-xs font-bold transition-all hover:scale-105 active:scale-95"
        >
          <div className="relative">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <span>{!isStandalone ? 'Instalar App' : 'Ativar Notificações'}</span>
        </button>
      )}

      {/* 3. COMPLETE TUTORIAL & NOTIFICATION MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Aplicativo & Notificações</h2>
                  <p className="text-xs text-slate-500">Tutorial de instalação no celular e alertas matinais</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold ${
                    testSuccess || feedback.includes('✅') || feedback.includes('🎉')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {feedback}
                </div>
              )}

              {/* SECTION A: INSTALLATION STATUS / TUTORIAL */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    1. Instalação no Celular (PWA)
                  </h3>
                  {isStandalone ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      App Já Instalado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {isIOS ? 'Dispositivo iOS' : isAndroid ? 'Dispositivo Android' : 'Navegador Web'}
                    </span>
                  )}
                </div>

                {isStandalone ? (
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900 flex items-start gap-3">
                    <span className="text-lg">🎉</span>
                    <div>
                      <p className="font-bold">Você já está usando o Iris Gestão como aplicativo nativo!</p>
                      <p className="text-emerald-700 mt-0.5">
                        O app já está adicionado à tela inicial. Agora certifique-se de ativar as notificações abaixo para receber os alertas das 07:30.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 1-Click Native Prompt for Android if available */}
                    {deferredPrompt && (
                      <button
                        type="button"
                        onClick={handleNativeInstall}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Instalar Aplicativo com 1 Clique
                      </button>
                    )}

                    {/* iOS Specific Tutorial */}
                    {isIOS ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-1.01.04-2.1 1.05-2.73 1.79-.56.64-.99 1.69-.93 2.71 1.13.09 2.03-.88 2.65-1.63z" />
                          </svg>
                          <span>Como Instalar no iPhone / iPad (Safari):</span>
                        </div>
                        <ol className="space-y-2 text-slate-600 list-decimal list-inside pl-1 font-medium leading-relaxed">
                          <li>
                            Toque no botão de <strong>Compartilhar</strong> na barra inferior do Safari (o ícone de quadrado com a seta para cima <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">⎋</span> ou <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">[↑]</span>).
                          </li>
                          <li>
                            Role a lista de opções para cima e selecione <strong>"Adicionar à Tela de Início"</strong> (ícone com <span className="font-bold text-indigo-600">+</span>).
                          </li>
                          <li>
                            Toque em <strong>"Adicionar"</strong> no canto superior direito da tela.
                          </li>
                          <li className="text-amber-800 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200">
                            ⭐ <strong>Atenção Apple:</strong> Após adicionar, abra o aplicativo pelo novo ícone <strong>Iris Gestão</strong> na tela inicial para poder autorizar as notificações push (o iOS só permite notificações se aberto da tela de início).
                          </li>
                        </ol>
                      </div>
                    ) : (
                      /* Android Specific Tutorial */
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8 12 8s-3.5902.4116-5.1368 1.0507L4.8409 5.5477a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                          </svg>
                          <span>Como Instalar no Android (Chrome):</span>
                        </div>
                        <ol className="space-y-2 text-slate-600 list-decimal list-inside pl-1 font-medium leading-relaxed">
                          <li>
                            Toque no menu de <strong>3 pontinhos (⋮)</strong> no canto superior direito do Chrome.
                          </li>
                          <li>
                            Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                          </li>
                          <li>
                            Toque em <strong>"Instalar"</strong>.
                          </li>
                          <li>
                            O ícone do Iris Gestão surgirá junto aos seus aplicativos na tela do celular.
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION B: NOTIFICATIONS STATUS & TEST */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    2. Notificações Push Diárias (07:30)
                  </h3>
                  {isSubscribed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Ativo
                    </span>
                  ) : permission === 'denied' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      Bloqueado no Navegador
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      Não Ativado
                    </span>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⏰</span>
                    <div>
                      <p className="font-bold text-slate-800">Resumo Diário às 07:30 da Manhã</p>
                      <p className="text-slate-500 mt-0.5 leading-relaxed">
                        Todo dia, de segunda a segunda, o sistema verifica as encomendas do dia e envia um push no seu celular. Aos domingos, ele envia a agenda da semana completa para planejar a produção.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {!isSubscribed ? (
                      <button
                        type="button"
                        onClick={handleSubscribe}
                        disabled={loading || permission === 'denied'}
                        className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        {loading ? (
                          <>
                            <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Conectando Dispositivo...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            Ativar Notificações no Celular
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleTestNotification}
                          disabled={loading}
                          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors flex-1"
                        >
                          {loading ? (
                            'Disparando Push...'
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Disparar Notificação de Teste Imediata
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleSubscribe}
                          disabled={loading}
                          className="py-2.5 px-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                        >
                          Reconectar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[11px] text-slate-400">
                {isSubscribed ? 'Dispositivo conectado e pronto para receber push' : 'Dispositivo aguardando ativação'}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
