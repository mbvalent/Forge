import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

const secret = process.env.SESSION_SECRET
if (!secret) throw new Error('SESSION_SECRET env var is not set')
const encodedKey = new TextEncoder().encode(secret)

export async function encrypt(payload: { expiresAt: Date }): Promise<string> {
  return new SignJWT({ expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}
