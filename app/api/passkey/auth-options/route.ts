import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { readCredential } from '@/lib/passkey-store'

export async function GET(request: NextRequest) {
  const rpID = request.nextUrl.hostname
  const credential = await readCredential()

  if (!credential) {
    return NextResponse.json({ error: 'No passkey registered' }, { status: 404 })
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [{ id: credential.id, transports: ['internal'] }],
    userVerification: 'required',
  })

  const cookieStore = await cookies()
  cookieStore.set('passkey-challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 5,
    path: '/',
  })

  return NextResponse.json(options)
}
