'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    let message = 'Não foi possível concluir a ação. Tente novamente.'
    if (error.message.includes('Email not confirmed')) {
      message = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou desative a confirmação de e-mail no Supabase durante o desenvolvimento.'
    } else if (error.message.includes('rate limit')) {
      message = 'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.'
    } else if (error.message.includes('Invalid login credentials')) {
      message = 'E-mail ou senha inválidos.'
    }
    return { error: message }
  }

  redirect('/dashboard')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const { data, error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    }
  })

  if (error) {
    let message = 'Não foi possível concluir a ação. Tente novamente.'
    if (error.message.includes('rate limit')) {
      message = 'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.'
    }
    return { error: message }
  }

  // If email confirmation is disabled, user is created and logged in immediately
  if (data.session) {
    redirect('/dashboard')
  }

  // If email confirmation is required
  return {
    message:
      'Cadastro realizado! Verifique seu email para confirmar sua conta.',
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
