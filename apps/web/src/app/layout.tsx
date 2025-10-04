import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import '../index.css'
import Providers from '@/components/providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'journey-radar',
  description: 'journey-radar',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="max-w-md mx-auto bg-background min-h-screen shadow-xl">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
