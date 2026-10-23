import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// In Next.js 16, the file is named proxy.ts and the function is named proxy.
// middleware.ts is deprecated. We keep this file for compatibility.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
