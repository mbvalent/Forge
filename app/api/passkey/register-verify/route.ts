import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { writeCredential } from '@/lib/passkey-store'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const challenge = cookieStore.get('passkey-challenge')?.value

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 })
  }

  const body = await request.json()
  const rpID = request.nextUrl.hostname
  const origin = request.nextUrl.origin

  try {
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    })

    if (!verified || !registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    const { credential } = registrationInfo

    await writeCredential({
      id: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      rpID,
    })

    cookieStore.delete('passkey-challenge')

    // Return all values needed for Vercel env vars (credential data is not secret)
    return NextResponse.json({
      verified: true,
      envVars: {
        PASSKEY_CREDENTIAL_ID: credential.id,
        PASSKEY_PUBLIC_KEY: isoBase64URL.fromBuffer(credential.publicKey),
        PASSKEY_RP_ID: rpID,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
