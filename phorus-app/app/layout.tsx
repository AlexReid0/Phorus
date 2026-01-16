import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Phorus - Bridge to Hyperliquid',
  description: 'Bridge your assets to Hyperliquid',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
