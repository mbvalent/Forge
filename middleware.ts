import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

export default async function middleware(req: NextRequest) {
  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Protect everything except: login page, login API, Next.js internals, static files with extensions
  matcher: ['/((?!login|api/login|_next/static|_next/image|.*\\..*).*)'],
}
