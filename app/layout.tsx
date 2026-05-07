import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Iris Gestão — Gestão Financeira',
  description: 'Sistema de gestão financeira para pedidos, festas e eventos.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
