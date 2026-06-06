import type { Metadata } from 'next'
import { Oxanium, Noto_Serif } from 'next/font/google'
import './globals.css'

const oxanium = Oxanium({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Forge',
  description: 'Personal fitness tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090b" />
      </head>
      <body
        className={`${oxanium.variable} ${notoSerif.variable} font-sans bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
