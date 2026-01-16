import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Phorus - Bridge to Hyperliquid',
  description: 'A bridge directly integrated into Hyperliquid',
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
