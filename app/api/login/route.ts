import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/lib/session'
import { loginSchema } from '@/lib/schemas/auth'

const APP_PASSWORD = process.env.APP_PASSWORD
if (!APP_PASSWORD) throw new Error('APP_PASSWORD env var is not set')

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const result = loginSchema.safeParse({ password: formData.get('password') })

  if (!result.success || result.data.password !== APP_PASSWORD) {
    return NextResponse.redirect(new URL('/login?error=1', request.url), { status: 303 })
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

  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
