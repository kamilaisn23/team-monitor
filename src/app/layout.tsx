import type { Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'
import { Providers } from './providers'
import '@/css/globals.css'
import '@/css/satoshi.css'

export const metadata: Metadata = {
  title: 'Team Monitor',
  description: 'Engineering team activity monitor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <NextTopLoader showSpinner={false} />
          {children}
        </Providers>
      </body>
    </html>
  )
}
