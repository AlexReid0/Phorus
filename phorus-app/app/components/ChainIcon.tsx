interface ChainIconProps {
  chainId: string
  size?: number
}

export default function ChainIcon({ chainId, size = 24 }: ChainIconProps) {
  // Chain logo URLs from trusted CDN
  const chainLogos: Record<string, string> = {
    ethereum: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    arbitrum: 'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg',
    optimism: 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png',
    base: 'https://assets.coingecko.com/coins/images/27509/large/base.png',
    hyperliquid: 'https://assets.coingecko.com/coins/images/28205/large/Hyperliquid.png',
  }

  // Fallback colors if image fails to load
  const fallbackColors: Record<string, string> = {
    ethereum: '#627EEA',
    arbitrum: '#28A0F0',
    optimism: '#FF0420',
    base: '#0052FF',
    hyperliquid: '#A8F5D0',
  }

  const logoUrl = chainLogos[chainId]
  const fallbackColor = fallbackColors[chainId] || '#666'

  if (!logoUrl) {
    // Fallback to colored circle if no logo
    return (
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          backgroundColor: fallbackColor,
        }}
      />
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: fallbackColor,
      }}
    >
      <img
        src={logoUrl}
        alt={chainId}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to colored circle if image fails
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.style.backgroundColor = fallbackColor
          }
        }}
      />
    </div>
  )
}
