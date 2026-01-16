'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { mainnet, arbitrum, optimism, base } from 'wagmi/chains'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { useState } from 'react'

// Get project ID from environment variable
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dummy-project-id'

// Configure chains
const chains = [mainnet, arbitrum, optimism, base]

// Create Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
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

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
