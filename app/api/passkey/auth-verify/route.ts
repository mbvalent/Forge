import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { readCredential, decodePublicKey, updateCounter } from '@/lib/passkey-store'
import { encrypt } from '@/lib/session'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const challenge = cookieStore.get('passkey-challenge')?.value

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 })
  }

  const storedCred = await readCredential()
  if (!storedCred) {
    return NextResponse.json({ error: 'No passkey registered' }, { status: 404 })
  }

  const body = await request.json()
  const rpID = request.nextUrl.hostname
  const origin = request.nextUrl.origin

  try {
    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: storedCred.id,
        publicKey: decodePublicKey(storedCred.publicKey),
        counter: storedCred.counter,
      },
    })

    if (!verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 401 })
    }

    await updateCounter(authenticationInfo.newCounter)
    cookieStore.delete('passkey-challenge')

    // Set session cookie — identical to password login
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const session = await encrypt({ expiresAt })
    cookieStore.set('session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return NextResponse.json({ verified: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
