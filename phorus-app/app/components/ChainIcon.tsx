import { useState } from 'react'
import { CHAIN_IDS } from '../utils/lifi'

interface ChainIconProps {
  chainId: string
  size?: number
}

// Get chain logo URL - use Trust Wallet assets (free, no API key needed)
function getChainLogoUrl(chainId: string): string | null {
  // Hyperliquid doesn't have a Trust Wallet asset, return null to show fallback
  if (chainId === 'hyperliquid') {
    return null // Will show 'H' fallback
  }
  
  const chainMap: Record<string, string> = {
    ethereum: 'ethereum',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    base: 'base',
  }
  
  const chainName = chainMap[chainId]
  if (!chainName) return null
  
  // Trust Wallet format: https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/{chain}/info/logo.png
  // This is free and doesn't require API keys
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/info/logo.png`
}

// Fallback colors if image fails to load
const getChainColor = (chainId: string): string => {
  const fallbackColors: Record<string, string> = {
    ethereum: '#627EEA',
    arbitrum: '#28A0F0',
    optimism: '#FF0420',
    base: '#0052FF',
    hyperliquid: '#A8F5D0',
  }
  return fallbackColors[chainId] || '#666'
}

export default function ChainIcon({ chainId, size = 24 }: ChainIconProps) {
  const [logoError, setLogoError] = useState(false)
  const logoUrl = getChainLogoUrl(chainId)
  const fallbackColor = getChainColor(chainId)
  const showFallback = !logoUrl || logoError

  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 relative"
      style={{
        width: size,
        height: size,
        backgroundColor: fallbackColor,
      }}
    >
      {logoUrl && !logoError ? (
        <img
          src={logoUrl}
          alt={chainId}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setLogoError(true)}
        />
      ) : null}
      {showFallback && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold pointer-events-none">
          {chainId === 'ethereum' && 'Ξ'}
          {chainId === 'arbitrum' && 'A'}
          {chainId === 'optimism' && 'O'}
          {chainId === 'base' && 'B'}
          {chainId === 'hyperliquid' && 'H'}
          {!['ethereum', 'arbitrum', 'optimism', 'base', 'hyperliquid'].includes(chainId) && chainId[0]?.toUpperCase()}
        </div>
      )}
    </div>
  )
}
