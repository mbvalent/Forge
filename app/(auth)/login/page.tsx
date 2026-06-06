import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-svh flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading tracking-widest">FORGE</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Personal fitness tracker</p>
        </CardHeader>
        <CardContent>
          <form action="/api/login" method="POST" className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                name="password"
                placeholder="Password"
                required
                autoFocus
                className="h-12 text-base"
              />
              {error && (
                <p className="text-destructive text-sm">Incorrect password. Try again.</p>
              )}
            </div>
            <Button type="submit" className="w-full h-12 text-base">
              Enter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
