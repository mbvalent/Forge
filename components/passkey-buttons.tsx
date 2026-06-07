'use client'

import { useState } from 'react'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { FingerPrintScanIcon } from '@hugeicons/core-free-icons'

type EnvVars = {
  PASSKEY_CREDENTIAL_ID: string
  PASSKEY_PUBLIC_KEY: string
  PASSKEY_RP_ID: string
}

type Status = { type: 'error'; message: string } | { type: 'success'; message: string } | null

export default function PasskeyButtons() {
  const [loading, setLoading] = useState<'auth' | 'register' | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [envVars, setEnvVars] = useState<EnvVars | null>(null)

  async function handleAuth() {
    setLoading('auth')
    setStatus(null)
    try {
      const optRes = await fetch('/api/passkey/auth-options')
      if (optRes.status === 404) throw new Error('No passkey registered — use the password to log in, then register this device')
      if (!optRes.ok) throw new Error('Failed to get authentication options')
      const optionsJSON = await optRes.json()

      const authResponse = await startAuthentication({ optionsJSON })

      const verifyRes = await fetch('/api/passkey/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResponse),
      })
      if (!verifyRes.ok) {
        const data = await verifyRes.json()
        throw new Error(data.error ?? 'Verification failed')
      }

      window.location.href = '/'
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Authentication failed',
      })
    } finally {
      setLoading(null)
    }
  }

  async function handleRegister() {
    setLoading('register')
    setStatus(null)
    setEnvVars(null)
    try {
      const optRes = await fetch('/api/passkey/register-options')
      if (!optRes.ok) throw new Error('Failed to get registration options')
      const optionsJSON = await optRes.json()

      const regResponse = await startRegistration({ optionsJSON })

      const verifyRes = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regResponse),
      })
      const data = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(data.error ?? 'Registration failed')

      const isLocalhost = window.location.hostname === 'localhost'
      if (isLocalhost) {
        setStatus({ type: 'success', message: 'Device registered — you can now use biometric login.' })
      } else {
        setEnvVars(data.envVars)
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Registration failed',
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="relative flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-border/30" />
        <span className="text-xs text-muted-foreground/50 tracking-widest uppercase">or</span>
        <div className="flex-1 h-px bg-border/30" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full h-14 text-base font-semibold tracking-wide border-border/40 bg-background/20 hover:bg-background/40 hover:border-primary/40 transition-all duration-300 gap-3"
        onClick={handleAuth}
        disabled={loading !== null}
      >
        <HugeiconsIcon icon={FingerPrintScanIcon} size={22} className="shrink-0" />
        {loading === 'auth' ? 'Verifying…' : 'Sign in with Face ID / Touch ID'}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground/50 text-xs hover:text-muted-foreground transition-colors"
        onClick={handleRegister}
        disabled={loading !== null}
      >
        {loading === 'register' ? 'Registering…' : 'Register this device'}
      </Button>

      {status && (
        <p className={`text-sm text-center animate-in slide-in-from-top-1 ${status.type === 'error' ? 'text-destructive' : 'text-green-500'}`}>
          {status.message}
        </p>
      )}

      {envVars && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 animate-in slide-in-from-top-1">
          <p className="text-xs font-semibold text-amber-400">
            Device registered. Add these 3 env vars to Vercel, then redeploy:
          </p>
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground font-mono">{key}</p>
              <p className="text-[10px] font-mono text-foreground/80 break-all bg-background/40 rounded px-2 py-1 select-all">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
