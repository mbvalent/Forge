import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-svh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/login-bg.jpg"
          alt="Workout background"
          fill
          className="object-cover"
          priority
        />
        {/* Gradient overlay for better contrast and dark theme consistency */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      <Card className="w-full max-w-sm relative z-10 border-border/20 bg-background/60 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Subtle top highlight for the glass effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-4xl font-heading tracking-widest bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent drop-shadow-sm">
            FORGE
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-2 font-medium tracking-wide">
            Personal fitness tracker
          </p>
        </CardHeader>
        <CardContent className="pb-8">
          <form action="/api/login" method="POST" className="space-y-6 mt-4">
            <div className="space-y-2 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-primary/10 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
              <Input
                type="password"
                name="password"
                placeholder="Enter Passcode"
                required
                autoFocus
                className="h-14 text-lg text-center tracking-widest relative bg-background/50 border-border/50 focus-visible:ring-primary/50 placeholder:text-muted-foreground/50 transition-all duration-300"
              />
              {error && (
                <p className="text-destructive text-sm text-center font-medium animate-in slide-in-from-top-1">
                  Incorrect passcode. Try again.
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              size="lg"
              className="w-full h-14 text-lg font-bold tracking-wider hover:scale-[1.02] transition-transform duration-300 shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_30%,transparent)] hover:shadow-[0_0_25px_color-mix(in_oklch,var(--primary)_50%,transparent)]"
            >
              ENTER
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
