import { useState, useEffect, useRef } from 'react'
import { CHAIN_IDS } from '../utils/lifi'

interface ChainIconProps {
  chainId: string
  size?: number
}

// Map LiFi chain keys to Trust Wallet chain names
function getTrustWalletChainName(chainId: string): string | null {
  // Hyperliquid doesn't have a Trust Wallet asset
  if (chainId === 'hpl' || chainId === 'hyperliquid') {
    return null
  }
  
  // Map LiFi keys to Trust Wallet chain names
  const chainMap: Record<string, string> = {
    // Main chains
    'eth': 'ethereum',
    'arb': 'arbitrum',
    'opt': 'optimism',
    'bas': 'base',
    'pol': 'polygon',
    'ava': 'avalanche',
    'bsc': 'smartchain',
    'cro': 'cronos',
    'ftm': 'fantom',
    'celo': 'celo',
    'gnosis': 'gnosis',
    'zksync': 'zksync',
    'linea': 'linea',
    'scroll': 'scroll',
    'blast': 'blast',
    'moonbeam': 'moonbeam',
    'mantle': 'mantle',
    'opbnb': 'opbnb',
    // Also handle if already in full format
    'ethereum': 'ethereum',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base',
    'polygon': 'polygon',
    'avalanche': 'avalanche',
    'smartchain': 'smartchain',
    'cronos': 'cronos',
    'fantom': 'fantom',
    'gnosis': 'gnosis',
    'zksync': 'zksync',
    'linea': 'linea',
    'scroll': 'scroll',
    'blast': 'blast',
    'moonbeam': 'moonbeam',
    'mantle': 'mantle',
    'opbnb': 'opbnb',
  }
  
  return chainMap[chainId.toLowerCase()] || null
}

// Get chain logo URL - use Trust Wallet assets (free, no API key needed)
function getChainLogoUrl(chainId: string): string | null {
  const trustWalletChain = getTrustWalletChainName(chainId)
  if (!trustWalletChain) {
    return null // Will show fallback
  }
  
  // Trust Wallet format: https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/{chain}/info/logo.png
  // This is free and doesn't require API keys
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustWalletChain}/info/logo.png`
}

// Fallback colors if image fails to load
const getChainColor = (chainId: string): string => {
  const fallbackColors: Record<string, string> = {
    // LiFi keys
    'eth': '#627EEA',
    'arb': '#28A0F0',
    'opt': '#FF0420',
    'bas': '#0052FF',
    'pol': '#8247E5',
    'ava': '#E84142',
    'bsc': '#F3BA2F',
    'cro': '#002D74',
    'ftm': '#1969FF',
    'celo': '#35D07F',
    'gnosis': '#04795B',
    'zksync': '#8C8DFC',
    'linea': '#000000',
    'scroll': '#FFE6D3',
    'blast': '#FCFC03',
    'moonbeam': '#53CBC9',
    'mantle': '#000000',
    'opbnb': '#F3BA2F',
    'hpl': '#A8F5D0',
    'hyperliquid': '#A8F5D0',
    // Full names
    'ethereum': '#627EEA',
    'arbitrum': '#28A0F0',
    'optimism': '#FF0420',
    'base': '#0052FF',
    'polygon': '#8247E5',
    'avalanche': '#E84142',
    'smartchain': '#F3BA2F',
    'cronos': '#002D74',
    'fantom': '#1969FF',
    'celo': '#35D07F',
    'gnosis': '#04795B',
    'zksync': '#8C8DFC',
    'linea': '#000000',
    'scroll': '#FFE6D3',
    'blast': '#FCFC03',
    'moonbeam': '#53CBC9',
    'mantle': '#000000',
    'opbnb': '#F3BA2F',
  }
  return fallbackColors[chainId.toLowerCase()] || '#666'
}

export default function ChainIcon({ chainId, size = 24 }: ChainIconProps) {
  const [logoError, setLogoError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const logoUrl = getChainLogoUrl(chainId)
  const fallbackColor = getChainColor(chainId)
  const showFallback = !logoUrl || logoError

  // Lazy load: only load image when it's in viewport
  useEffect(() => {
    if (!logoUrl || shouldLoad) return

    // For small icons, check if parent is visible immediately
    const checkVisibility = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200
        if (isVisible) {
          setShouldLoad(true)
          return true
        }
      }
      return false
    }

    // Check immediately
    if (checkVisibility()) return

    // Set up observer for when it comes into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '200px', // Start loading 200px before it comes into view
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [logoUrl, shouldLoad])

  // Debug: log when logo fails
  const handleLogoError = () => {
    console.log('[ChainIcon] Logo failed to load', { chainId, logoUrl })
    setLogoError(true)
  }

  return (
    <div
      ref={containerRef}
      className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 relative"
      style={{
        width: size,
        height: size,
        backgroundColor: fallbackColor,
      }}
    >
      {logoUrl && !logoError && shouldLoad ? (
        <img
          src={logoUrl}
          alt={chainId}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={handleLogoError}
        />
      ) : null}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold pointer-events-none">
          {(chainId.toLowerCase() === 'eth' || chainId.toLowerCase() === 'ethereum') && 'Ξ'}
          {(chainId.toLowerCase() === 'arb' || chainId.toLowerCase() === 'arbitrum') && 'A'}
          {(chainId.toLowerCase() === 'opt' || chainId.toLowerCase() === 'optimism') && 'O'}
          {(chainId.toLowerCase() === 'bas' || chainId.toLowerCase() === 'base') && 'B'}
          {(chainId.toLowerCase() === 'pol' || chainId.toLowerCase() === 'polygon') && 'P'}
          {(chainId.toLowerCase() === 'ava' || chainId.toLowerCase() === 'avalanche') && 'A'}
          {(chainId.toLowerCase() === 'bsc' || chainId.toLowerCase() === 'smartchain') && 'B'}
          {(chainId.toLowerCase() === 'hpl' || chainId.toLowerCase() === 'hyperliquid') && 'H'}
          {!['eth', 'ethereum', 'arb', 'arbitrum', 'opt', 'optimism', 'bas', 'base', 'pol', 'polygon', 'ava', 'avalanche', 'bsc', 'smartchain', 'hpl', 'hyperliquid'].includes(chainId.toLowerCase()) && chainId[0]?.toUpperCase()}
        </div>
      )}
    </div>
  )
}
