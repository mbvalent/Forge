import 'server-only'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { isoBase64URL } from '@simplewebauthn/server/helpers'

export type StoredCredential = {
  id: string        // Base64URLString — the credential ID
  publicKey: string // Base64URLString — Uint8Array public key encoded as base64url
  counter: number
  rpID: string
}

const PASSKEY_FILE = path.join(process.cwd(), 'data', 'passkey.json')

export async function readCredential(): Promise<StoredCredential | null> {
  // Vercel production: set PASSKEY_CREDENTIAL_ID + PASSKEY_PUBLIC_KEY as env vars after local registration
  const envID = process.env.PASSKEY_CREDENTIAL_ID
  const envKey = process.env.PASSKEY_PUBLIC_KEY
  if (envID && envKey) {
    return {
      id: envID,
      publicKey: envKey,
      counter: parseInt(process.env.PASSKEY_COUNTER ?? '0', 10),
      rpID: process.env.PASSKEY_RP_ID ?? 'localhost',
    }
  }

  try {
    const raw = await readFile(PASSKEY_FILE, 'utf-8')
    return JSON.parse(raw) as StoredCredential
  } catch {
    return null
  }
}

export async function writeCredential(cred: StoredCredential): Promise<void> {
  await mkdir(path.dirname(PASSKEY_FILE), { recursive: true })
  await writeFile(PASSKEY_FILE, JSON.stringify(cred, null, 2), 'utf-8')
}

export async function updateCounter(newCounter: number): Promise<void> {
  try {
    const cred = await readCredential()
    if (cred) await writeCredential({ ...cred, counter: newCounter })
  } catch {
    // Read-only filesystem (Vercel): counter drift accepted for personal use
  }
}

export function decodePublicKey(publicKey: string): Uint8Array<ArrayBuffer> {
  // new Uint8Array(typedArray) copies into a fresh ArrayBuffer, satisfying strict Uint8Array<ArrayBuffer> type
  return new Uint8Array(isoBase64URL.toBuffer(publicKey))
}
