import { useState } from 'react'
import ChainIcon from './ChainIcon'
import { TOKEN_ADDRESSES, CHAIN_IDS } from '../utils/lifi'

interface TokenIconProps {
  symbol: string
  size?: number
  chainId?: string
}

// Get token logo URL - use Trust Wallet assets (free, no API key needed)
function getTokenLogoUrl(symbol: string, chainId?: string): string | null {
  if (!symbol || !chainId) return null
  
  // Get token address for address-based lookups
  const chainTokens = TOKEN_ADDRESSES[chainId]
  const address = chainTokens?.[symbol]
  
  // If no address or native token, return null to show fallback
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return null
  }
  
  // Map chain IDs to Trust Wallet chain names
  const chainMap: Record<string, string> = {
    ethereum: 'ethereum',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    base: 'base',
    hyperliquid: 'ethereum', // Hyperliquid tokens use Ethereum addresses
  }
  
  const chainName = chainMap[chainId] || 'ethereum'
  // Trust Wallet requires lowercase addresses
  const addressLower = address.toLowerCase()
  
  // Trust Wallet format: https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/{chain}/assets/{address}/logo.png
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${addressLower}/logo.png`
}

// Fallback colors for tokens
const getTokenColor = (symbol: string): string => {
  const colors: Record<string, string> = {
    USDC: '#2775CA',
    USDT: '#26A17B',
    ETH: '#627EEA',
    WBTC: '#F7931A',
    DAI: '#F5AC37',
    'USDC.e': '#2775CA',
    WETH: '#627EEA',
    ARB: '#28A0F0',
    OP: '#FF0420',
    MATIC: '#8247E5',
    LINK: '#375BD2',
    UNI: '#FF007A',
    AAVE: '#B6509E',
    FRAX: '#000000',
    CRV: '#40649F',
    SNX: '#00D1FF',
    MKR: '#1AAB9B',
    LDO: '#00A3FF',
  }
  return colors[symbol] || '#666'
}

export default function TokenIcon({ symbol, size = 24, chainId }: TokenIconProps) {
  const [logoError, setLogoError] = useState(false)
  const logoUrl = getTokenLogoUrl(symbol, chainId)
  const color = getTokenColor(symbol)
  const badgeSize = Math.max(size * 0.35, 10)
  const showFallback = !logoUrl || logoError

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Main token icon */}
      <div
        className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 relative"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      >
        {logoUrl && !logoError ? (
          <img
            src={logoUrl}
            alt={symbol}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setLogoError(true)}
          />
        ) : null}
        {/* Fallback: show first letter if no logo or logo failed */}
        {showFallback && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold pointer-events-none">
            {symbol[0]?.toUpperCase() || '?'}
          </div>
        )}
      </div>
      
      {/* Chain badge in bottom right corner */}
      {chainId && (
        <div
          className="absolute rounded-full border-2 border-black"
          style={{
            width: badgeSize,
            height: badgeSize,
            bottom: -2,
            right: -2,
          }}
        >
          <ChainIcon chainId={chainId} size={badgeSize} />
        </div>
      )}
    </div>
  )
}
