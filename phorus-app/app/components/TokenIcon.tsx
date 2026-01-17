import ChainIcon from './ChainIcon'

interface TokenIconProps {
  symbol: string
  size?: number
  chainId?: string
}

export default function TokenIcon({ symbol, size = 24, chainId }: TokenIconProps) {
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
  }

  const color = colors[symbol] || '#666'
  const badgeSize = Math.max(size * 0.35, 10) // Chain badge is 35% of token size, minimum 10px

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Main token icon */}
      <div
        className="rounded-full flex items-center justify-center text-white text-xs font-semibold"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      >
        {symbol === 'USDC' && '$'}
        {symbol === 'USDT' && '₮'}
        {symbol === 'ETH' && 'Ξ'}
        {symbol === 'WBTC' && '₿'}
        {symbol === 'DAI' && '◈'}
        {symbol === 'USDC.e' && '$'}
        {symbol === 'WETH' && 'Ξ'}
        {symbol === 'ARB' && 'A'}
        {symbol === 'OP' && 'O'}
        {symbol === 'MATIC' && 'M'}
        {!['USDC', 'USDT', 'ETH', 'WBTC', 'DAI', 'USDC.e', 'WETH', 'ARB', 'OP', 'MATIC'].includes(symbol) && symbol[0]}
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
