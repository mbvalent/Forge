import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { readCredential } from '@/lib/passkey-store'

export async function GET(request: NextRequest) {
  const rpID = request.nextUrl.hostname
  const existing = await readCredential()

  const options = await generateRegistrationOptions({
    rpName: 'Forge',
    rpID,
    userName: 'owner',
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
    excludeCredentials: existing ? [{ id: existing.id }] : [],
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
