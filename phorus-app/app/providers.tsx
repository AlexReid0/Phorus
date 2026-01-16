'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { mainnet, arbitrum, optimism, base } from 'wagmi/chains'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { useState } from 'react'

// Get project ID from environment variable
// Reown AppKit uses NEXT_PUBLIC_PROJECT_ID or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 
                  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 
                  ''

// Configure chains
const chains = [mainnet, arbitrum, optimism, base]

// Only initialize if we have a valid project ID
if (!projectId) {
  console.warn('⚠️ WalletConnect Project ID not found. Please set NEXT_PUBLIC_PROJECT_ID or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local file')
}

// Create Wagmi adapter (only if projectId exists)
let wagmiAdapter: WagmiAdapter | null = null
if (projectId) {
  wagmiAdapter = new WagmiAdapter({
    networks: chains,
    projectId,
  })

  // Create AppKit instance
  createAppKit({
    adapters: [wagmiAdapter],
    networks: chains as any,
    projectId,
    features: {
      analytics: false,
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#a8f5d0',
      '--w3m-color-mix': '#0a1f0a',
      '--w3m-border-radius-master': '12px',
    },
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  if (!wagmiAdapter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-green text-white">
        <div className="text-center p-8">
          <h1 className="text-2xl font-serif mb-4">Configuration Error</h1>
          <p className="text-gray-400 mb-2">
            WalletConnect Project ID not configured.
          </p>
          <p className="text-sm text-gray-500">
            Please set NEXT_PUBLIC_PROJECT_ID or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local file
          </p>
        </div>
      </div>
    )
  }

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
