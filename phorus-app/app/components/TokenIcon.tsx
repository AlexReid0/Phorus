import { useState, useEffect, useRef } from 'react'
import { getAddress } from 'viem'
import ChainIcon from './ChainIcon'
import { TOKEN_ADDRESSES, CHAIN_IDS } from '../utils/lifi'

interface TokenIconProps {
  symbol: string
  size?: number
  chainId?: string
}

// Map LiFi chain keys (like 'eth', 'arb') to TOKEN_ADDRESSES keys (like 'ethereum', 'arbitrum')
function getTokenAddressesKey(chainId: string): string | null {
  const chainMap: Record<string, string> = {
    'eth': 'ethereum',
    'arb': 'arbitrum',
    'opt': 'optimism',
    'bas': 'base',
    'pol': 'polygon',
    'ava': 'avalanche',
    'bsc': 'bsc',
    'hpl': 'hyperliquid', // Hyperliquid has its own section in TOKEN_ADDRESSES
    'hyperliquid': 'hyperliquid',
    // Also handle if already in correct format
    'ethereum': 'ethereum',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base',
    'polygon': 'polygon',
    'avalanche': 'avalanche',
    'hyperliquid': 'hyperliquid',
  }
  return chainMap[chainId] || null
}

// Map TOKEN_ADDRESSES keys to Trust Wallet chain names
function getTrustWalletChainName(addressesKey: string): string {
  const trustWalletMap: Record<string, string> = {
    'ethereum': 'ethereum',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base',
    'polygon': 'polygon',
    'avalanche': 'avalanche',
    'bsc': 'smartchain',
    'hyperliquid': 'ethereum', // Hyperliquid tokens use Ethereum addresses in Trust Wallet
  }
  return trustWalletMap[addressesKey] || 'ethereum'
}

// Get token logo URL - use Trust Wallet assets (free, no API key needed)
function getTokenLogoUrl(symbol: string, chainId?: string): string | null {
  if (!symbol || !chainId) {
    console.log('[TokenIcon] Missing symbol or chainId', { symbol, chainId })
    return null
  }
  
  // Map chainId to TOKEN_ADDRESSES key
  const addressesKey = getTokenAddressesKey(chainId)
  if (!addressesKey) {
    console.log('[TokenIcon] No addressesKey found for chainId', { chainId, symbol })
    return null
  }
  
  // Get token address for address-based lookups
  const chainTokens = TOKEN_ADDRESSES[addressesKey]
  if (!chainTokens) {
    console.log('[TokenIcon] No chainTokens found', { addressesKey, symbol })
    return null
  }
  
  // Try exact match first, then case-insensitive match
  let address = chainTokens[symbol]
  if (!address) {
    // Try case-insensitive lookup
    const symbolUpper = symbol.toUpperCase()
    const symbolLower = symbol.toLowerCase()
    address = chainTokens[symbolUpper] || chainTokens[symbolLower] || chainTokens[symbol]
  }
  
  // Handle native ETH - use native coin logo from Trust Wallet
  if (symbol.toUpperCase() === 'ETH' && (!address || address === '0x0000000000000000000000000000000000000000')) {
    const trustWalletChain = getTrustWalletChainName(addressesKey)
    // Native coins use info/logo.png instead of assets/{address}/logo.png
    const logoUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustWalletChain}/info/logo.png`
    console.log('[TokenIcon] Using native ETH logo', { symbol, chainId, trustWalletChain, logoUrl })
    return logoUrl
  }
  
  // Special handling for USDC on Ethereum mainnet - use standard USDC address
  // The address in TOKEN_ADDRESSES might be incorrect, so fallback to standard address
  if (symbol.toUpperCase() === 'USDC' && addressesKey === 'ethereum') {
    // Standard USDC on Ethereum mainnet
    const standardUSDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    if (!address || address !== standardUSDC) {
      console.log('[TokenIcon] Using standard USDC address for Ethereum', { 
        symbol, 
        foundAddress: address, 
        usingStandard: standardUSDC 
      })
      address = standardUSDC
    }
  }
  
  // If no address, return null to show fallback
  if (!address) {
    // Debug: show what symbols are available
    const availableSymbols = Object.keys(chainTokens).filter(k => 
      k.toUpperCase().includes(symbol.toUpperCase()) || symbol.toUpperCase().includes(k.toUpperCase())
    ).slice(0, 10)
    console.log('[TokenIcon] No address found for token', { 
      symbol, 
      chainId, 
      addressesKey, 
      hasChainTokens: !!chainTokens,
      availableSymbols,
      exactMatch: chainTokens[symbol],
      upperMatch: chainTokens[symbol.toUpperCase()],
      lowerMatch: chainTokens[symbol.toLowerCase()],
    })
    return null
  }
  
  // Map to Trust Wallet chain name
  const trustWalletChain = getTrustWalletChainName(addressesKey)
  
  // Trust Wallet requires checksum addresses (mixed case), not lowercase
  // Try to get checksum address, fallback to original if it fails
  let checksumAddress = address
  try {
    checksumAddress = getAddress(address)
  } catch (e) {
    // If getAddress fails, use original address
    console.warn('[TokenIcon] Failed to get checksum address, using original', { address, symbol })
  }
  
  // Trust Wallet format: https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/{chain}/assets/{address}/logo.png
  const logoUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustWalletChain}/assets/${checksumAddress}/logo.png`
  console.log('[TokenIcon] Generated logo URL', { symbol, chainId, addressesKey, trustWalletChain, address: checksumAddress, logoUrl })
  return logoUrl
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
  const [shouldLoad, setShouldLoad] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const logoUrl = getTokenLogoUrl(symbol, chainId)
  const color = getTokenColor(symbol)
  const badgeSize = Math.max(size * 0.35, 10)
  const showFallback = !logoUrl || logoError

  // Lazy load: only load image when it's in viewport
  // For larger icons (size >= 32) in main sections, load immediately
  // For smaller icons in dropdowns, use IntersectionObserver
  useEffect(() => {
    if (!logoUrl || shouldLoad) return

    // For larger icons (main from/to sections), load immediately
    if (size >= 32) {
      setShouldLoad(true)
      return
    }

    // For small icons in dropdowns, check if parent is visible
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
  }, [logoUrl, shouldLoad, size])

  // Debug: log when logo fails
  const handleLogoError = () => {
    console.log('[TokenIcon] Logo failed to load', { symbol, chainId, logoUrl })
    setLogoError(true)
  }

  return (
    <div 
      ref={containerRef}
      className="relative flex-shrink-0" 
      style={{ width: size, height: size }}
    >
      {/* Main token icon */}
      <div
        className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 relative"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      >
        {logoUrl && !logoError && shouldLoad ? (
          <img
            ref={imgRef}
            src={logoUrl}
            alt={symbol}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={handleLogoError}
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
