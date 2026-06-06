import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/lib/session'
import { loginSchema } from '@/lib/schemas/auth'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const result = loginSchema.safeParse({ password: formData.get('password') })

  if (!result.success || result.data.password !== process.env.APP_PASSWORD) {
    return NextResponse.redirect(new URL('/login?error=1', request.url))
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ expiresAt })

  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return NextResponse.redirect(new URL('/', request.url))
}
