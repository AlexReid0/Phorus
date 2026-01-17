// LiFi API utility functions

const LIFI_API_BASE = 'https://li.quest/v1'
// Get integrator ID from environment variable (for tracking in LiFi portal)
// This should be set in .env.local as NEXT_PUBLIC_LIFI_INTEGRATOR_ID
const LIFI_INTEGRATOR_ID = process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || ''

// Import chain mappings from generated file
import { KEY_TO_CHAIN_ID } from '../../scripts/generated-chains'
// Import token addresses from generated file
import { TOKEN_ADDRESSES } from '../../scripts/generated-addresses'

// Chain ID mapping (LiFi uses numeric chain IDs)
// Maps LiFi chain keys (like 'eth', 'arb') to numeric chain IDs
export const CHAIN_IDS: Record<string, number> = KEY_TO_CHAIN_ID

// Re-export TOKEN_ADDRESSES for convenience
export { TOKEN_ADDRESSES }

export interface QuoteResponse {
  action: {
    fromToken: {
      address: string
      symbol: string
      decimals: number
    }
    toToken: {
      address: string
      symbol: string
      decimals: number
    }
    fromAmount: string
    toAmount: string
    slippage: number
    fromChainId: number
    toChainId: number
  }
  estimate: {
    fromAmount: string
    toAmount: string
    toAmountMin: string
    approvalAddress?: string
    feeCosts?: Array<{
      name: string
      description: string
      token: {
        address: string
        symbol: string
        decimals: number
      }
      amount: string
      amountUSD?: string
    }>
    gasCosts?: Array<{
      type: string
      price: string
      estimate: string
      limit: string
      amount: string
      amountUSD?: string
      token: {
        address: string
        symbol: string
        decimals: number
      }
    }>
    executionDuration: number
  }
  transactionRequest?: {
    data: string
    to: string
    value: string
    from: string
    chainId: number
    gasLimit: string
    gasPrice?: string
  }
}

export interface RouteResponse {
  routes: Array<{
    id: string
    fromChainId: number
    fromAmount: string
    fromAmountUSD: string
    toChainId: number
    toAmount: string
    toAmountUSD: string
    steps: Array<{
      id: string
      type: string
      action: {
        fromToken: {
          address: string
          symbol: string
        }
        toToken: {
          address: string
          symbol: string
        }
        fromAmount: string
        toAmount: string
        slippage: number
      }
      estimate: {
        fromAmount: string
        toAmount: string
        toAmountMin: string
        approvalAddress?: string
        feeCosts?: Array<unknown>
        gasCosts?: Array<unknown>
        executionDuration: number
      }
    }>
  }>
}

/**
 * Helper function to find token address with fallbacks
 */
// Map LiFi chain keys to TOKEN_ADDRESSES keys
function getTokenAddressKey(chainId: string): string {
  const chainKeyMap: Record<string, string> = {
    'eth': 'ethereum',
    'arb': 'arbitrum',
    'bas': 'base',
    'opt': 'optimism',
    'pol': 'polygon',
    'ava': 'avalanche',
    'bsc': 'bsc',
    'hpl': 'hyperliquid',
    'hyperliquid': 'hyperliquid',
    'ethereum': 'ethereum',
    'arbitrum': 'arbitrum',
    'base': 'base',
    'optimism': 'optimism',
    'polygon': 'polygon',
    'avalanche': 'avalanche',
  }
  return chainKeyMap[chainId] || chainId
}

/**
 * Query LiFi API for token address (for special cases like Hyperliquid spot USDC)
 */
async function getTokenFromLiFi(chainId: number, tokenSymbol: string): Promise<string | null> {
  try {
    // First, try direct token lookup
    try {
      const response = await fetch(`${LIFI_API_BASE}/token?chain=${chainId}&token=${encodeURIComponent(tokenSymbol)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.address && data.address !== '0x0000000000000000000000000000000000000000') {
          console.log(`Found ${tokenSymbol} address from LiFi for chain ${chainId}:`, data.address)
          return data.address
        }
      }
    } catch (err) {
      // Continue to fallback methods
    }
    
    // For Hyperliquid, try symbol variations
    if (chainId === 1337) {
      const symbolVariations = [tokenSymbol, `${tokenSymbol} Spot`, `${tokenSymbol}-SPOT`, `${tokenSymbol}_SPOT`]
      
      for (const symbol of symbolVariations) {
        try {
          const response = await fetch(`${LIFI_API_BASE}/token?chain=1337&token=${encodeURIComponent(symbol)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.address && data.address !== '0x0000000000000000000000000000000000000000') {
              console.log(`Found Hyperliquid ${symbol} address from LiFi:`, data.address)
              return data.address
            }
          }
        } catch (err) {
          continue
        }
      }
    }
    
    // Fallback: Query all tokens for the chain and search
    try {
      const response = await fetch(`${LIFI_API_BASE}/tokens?chain=${chainId}`)
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data.tokens)) {
          const tokenSymbolUpper = tokenSymbol.toUpperCase()
          // Look for matching token
          let foundToken = data.tokens.find((token: any) => 
            token.symbol?.toUpperCase() === tokenSymbolUpper || 
            token.name?.toUpperCase() === tokenSymbolUpper
          )
          
          // For Hyperliquid, also try to find spot tokens
          if (!foundToken && chainId === 1337) {
            foundToken = data.tokens.find((token: any) => {
              const symbolMatch = token.symbol?.toUpperCase().includes(tokenSymbolUpper)
              const nameMatch = token.name?.toLowerCase().includes(tokenSymbol.toLowerCase())
              const isSpot = token.name?.toLowerCase().includes('spot') || 
                           token.symbol?.toUpperCase().includes('SPOT')
              return (symbolMatch || nameMatch) && isSpot
            })
          }
          
          // For Hyperliquid USDC specifically, look for any USDC token
          if (!foundToken && chainId === 1337 && tokenSymbolUpper === 'USDC') {
            foundToken = data.tokens.find((token: any) => 
              token.symbol?.toUpperCase() === 'USDC' ||
              (token.symbol?.toUpperCase().includes('USDC') && 
               !token.address?.match(/0{20,}$/)) // Exclude invalid addresses
            )
          }
          
          if (foundToken?.address && 
              foundToken.address !== '0x0000000000000000000000000000000000000000' &&
              !foundToken.address.match(/0{20,}$/)) { // Exclude addresses ending with many zeros
            console.log(`Found ${tokenSymbol} token from LiFi tokens list for chain ${chainId}:`, foundToken)
            return foundToken.address
          }
        }
      }
    } catch (err) {
      console.error('Error querying LiFi tokens list:', err)
    }
    
    return null
  } catch (error) {
    console.error('Error querying LiFi token API:', error)
    return null
  }
}

function findTokenAddress(symbol: string, chainId: string): string | null {
  // For native tokens (ETH), use the zero address
  // BUT: Hyperliquid doesn't have ETH - it uses USDC as native token
  if (symbol === 'ETH' || symbol === 'WETH') {
    // Hyperliquid (chain ID 1337) doesn't support ETH
    if (chainId === 'hpl' || chainId === 'hyperliquid' || chainId === '1337') {
      return null // Return null so we can give a better error message
    }
    return '0x0000000000000000000000000000000000000000'
  }
  
  // For Hyperliquid, skip TOKEN_ADDRESSES lookup - always query LiFi API
  // The generated addresses file has invalid addresses for Hyperliquid
  if (chainId === 'hpl' || chainId === 'hyperliquid' || chainId === '1337') {
    return null // Return null to force LiFi API lookup
  }
  
  // Map chain ID to TOKEN_ADDRESSES key
  const tokenAddressKey = getTokenAddressKey(chainId)
  
  // Try exact match on the chain
  const chainTokens = TOKEN_ADDRESSES[tokenAddressKey]
  if (chainTokens?.[symbol]) {
    const address = chainTokens[symbol]
    // Filter out invalid addresses (ending with many zeros - these are placeholder addresses)
    if (address && !address.match(/0{20,}$/)) {
      return address
    }
  }
  
  // Try ethereum as fallback
  if (TOKEN_ADDRESSES['ethereum']?.[symbol]) {
    return TOKEN_ADDRESSES['ethereum'][symbol]
  }
  
  // Try case-insensitive match
  const symbolUpper = symbol.toUpperCase()
  if (chainTokens) {
    for (const [key, address] of Object.entries(chainTokens)) {
      if (key.toUpperCase() === symbolUpper) {
        return address
      }
    }
  }
  
  // Try ethereum as fallback with case-insensitive
  const ethTokens = TOKEN_ADDRESSES['ethereum']
  if (ethTokens && tokenAddressKey !== 'ethereum') {
    for (const [key, address] of Object.entries(ethTokens)) {
      if (key.toUpperCase() === symbolUpper) {
        return address
      }
    }
  }
  
  return null
}

/**
 * Get a quote for a bridge transaction
 */
export async function getQuote(params: {
  fromChain: string
  toChain: string
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
  toAddress?: string
  slippage?: number
}): Promise<QuoteResponse | null> {
  try {
    const fromChainId = CHAIN_IDS[params.fromChain]
    const toChainId = CHAIN_IDS[params.toChain]

    if (!fromChainId || !toChainId) {
      console.error('Unsupported chain:', params.fromChain, params.toChain)
      return null
    }

    // Look up token addresses using helper function
    let fromTokenAddress = findTokenAddress(params.fromToken, params.fromChain)
    let toTokenAddress = findTokenAddress(params.toToken, params.toChain)

    // For Hyperliquid tokens, ALWAYS try querying LiFi API if not found in TOKEN_ADDRESSES
    // This is critical because Hyperliquid uses different token addresses than standard EVM chains
    if (!toTokenAddress && toChainId === 1337) {
      console.log(`Querying LiFi API for Hyperliquid ${params.toToken}...`)
      const lifiTokenAddress = await getTokenFromLiFi(toChainId, params.toToken)
      if (lifiTokenAddress) {
        toTokenAddress = lifiTokenAddress
        console.log(`Found Hyperliquid ${params.toToken} address from LiFi:`, toTokenAddress)
      }
    }
    
    // Also try LiFi API for fromToken if on Hyperliquid
    if (!fromTokenAddress && fromChainId === 1337) {
      console.log(`Querying LiFi API for Hyperliquid ${params.fromToken}...`)
      const lifiTokenAddress = await getTokenFromLiFi(fromChainId, params.fromToken)
      if (lifiTokenAddress) {
        fromTokenAddress = lifiTokenAddress
        console.log(`Found Hyperliquid ${params.fromToken} address from LiFi:`, fromTokenAddress)
      }
    }
    
    // For other chains, try querying LiFi API as fallback if token not found
    if (!fromTokenAddress && fromChainId !== 1337) {
      console.log(`Token ${params.fromToken} not found in TOKEN_ADDRESSES for ${params.fromChain}, querying LiFi API...`)
      const lifiTokenAddress = await getTokenFromLiFi(fromChainId, params.fromToken)
      if (lifiTokenAddress) {
        fromTokenAddress = lifiTokenAddress
        console.log(`Found ${params.fromToken} address from LiFi for chain ${fromChainId}:`, fromTokenAddress)
      }
    }
    
    if (!toTokenAddress && toChainId !== 1337) {
      console.log(`Token ${params.toToken} not found in TOKEN_ADDRESSES for ${params.toChain}, querying LiFi API...`)
      const lifiTokenAddress = await getTokenFromLiFi(toChainId, params.toToken)
      if (lifiTokenAddress) {
        toTokenAddress = lifiTokenAddress
        console.log(`Found ${params.toToken} address from LiFi for chain ${toChainId}:`, toTokenAddress)
      }
    }

    // CRITICAL: Never use zero address for Hyperliquid tokens (they're not native like ETH)
    // Hyperliquid uses USDC as its native token, not ETH
    if (toChainId === 1337 && toTokenAddress === '0x0000000000000000000000000000000000000000') {
      // If trying to send ETH to Hyperliquid, this is invalid - Hyperliquid doesn't have ETH
      if (params.toToken === 'ETH' || params.toToken === 'WETH') {
        throw new Error(`ETH is not available on Hyperliquid. Please select USDC as the destination token. Hyperliquid uses USDC as its native token.`)
      }
      
      console.error('Invalid zero address for Hyperliquid token. Attempting LiFi API lookup...')
      const lifiTokenAddress = await getTokenFromLiFi(toChainId, params.toToken)
      if (lifiTokenAddress) {
        toTokenAddress = lifiTokenAddress
      } else {
        throw new Error(`Token ${params.toToken} is not available on Hyperliquid. Please select USDC as the destination token.`)
      }
    }

    if (!fromTokenAddress || !toTokenAddress) {
      const missingTokens = []
      if (!fromTokenAddress) missingTokens.push(`${params.fromToken} on ${params.fromChain}`)
      if (!toTokenAddress) missingTokens.push(`${params.toToken} on ${params.toChain}`)
      
      console.error('Token not found:', {
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromChain: params.fromChain,
        toChain: params.toChain,
        fromTokenAddress,
        toTokenAddress,
        missingTokens
      })
      
      // Throw error with helpful message
      throw new Error(`Token${missingTokens.length > 1 ? 's' : ''} not found: ${missingTokens.join(', ')}. Please select a different token.`)
    }

    // Convert amount to wei (assuming 18 decimals for simplicity, will adjust per token)
    const decimals = params.fromToken === 'ETH' ? 18 : 6 // USDC/USDT use 6 decimals
    const fromAmountWei = BigInt(Math.floor(parseFloat(params.fromAmount) * 10 ** decimals)).toString()

    const slippage = params.slippage || 0.03 // 3% default slippage

    const url = new URL(`${LIFI_API_BASE}/quote`)
    url.searchParams.set('fromChain', fromChainId.toString())
    url.searchParams.set('toChain', toChainId.toString())
    url.searchParams.set('fromToken', fromTokenAddress)
    url.searchParams.set('toToken', toTokenAddress)
    url.searchParams.set('fromAmount', fromAmountWei)
    url.searchParams.set('fromAddress', params.fromAddress)
    if (params.toAddress) {
      url.searchParams.set('toAddress', params.toAddress)
    }
    url.searchParams.set('slippage', slippage.toString())
    // Add integrator ID for tracking in LiFi portal
    if (LIFI_INTEGRATOR_ID) {
      url.searchParams.set('integrator', LIFI_INTEGRATOR_ID)
    }

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Unknown error'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorText
      } catch {
        errorMessage = errorText
      }
      console.error('LiFi API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        url: url.toString()
      })
      // Throw error with message so it can be caught and displayed
      throw new Error(errorMessage || `LiFi API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data as QuoteResponse
  } catch (error) {
    console.error('Error fetching quote:', error)
    return null
  }
}

/**
 * Get advanced routes (multi-step)
 */
export async function getRoutes(params: {
  fromChain: string
  toChain: string
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
  toAddress: string
  slippage?: number
}): Promise<RouteResponse | null> {
  try {
    const fromChainId = CHAIN_IDS[params.fromChain]
    let toChainId = CHAIN_IDS[params.toChain]

    if (!fromChainId || !toChainId) {
      console.error('Unsupported chain:', params.fromChain, params.toChain)
      return null
    }

    // Look up token addresses using helper function
    let fromTokenAddress = findTokenAddress(params.fromToken, params.fromChain)
    let toTokenAddress = findTokenAddress(params.toToken, params.toChain)

    // For Hyperliquid tokens, ALWAYS try querying LiFi API if not found in TOKEN_ADDRESSES
    if (!toTokenAddress && toChainId === 1337) {
      console.log(`Querying LiFi API for Hyperliquid ${params.toToken}...`)
      const lifiTokenAddress = await getTokenFromLiFi(toChainId, params.toToken)
      if (lifiTokenAddress) {
        toTokenAddress = lifiTokenAddress
        console.log(`Found Hyperliquid ${params.toToken} address from LiFi:`, toTokenAddress)
      }
    }
    
    if (!fromTokenAddress && fromChainId === 1337) {
      console.log(`Querying LiFi API for Hyperliquid ${params.fromToken}...`)
      const lifiTokenAddress = await getTokenFromLiFi(fromChainId, params.fromToken)
      if (lifiTokenAddress) {
        fromTokenAddress = lifiTokenAddress
        console.log(`Found Hyperliquid ${params.fromToken} address from LiFi:`, fromTokenAddress)
      }
    }
    
    // For other chains, try querying LiFi API as fallback
    if (!fromTokenAddress && fromChainId !== 1337) {
      const lifiTokenAddress = await getTokenFromLiFi(fromChainId, params.fromToken)
      if (lifiTokenAddress) {
        fromTokenAddress = lifiTokenAddress
      }
    }
    
    if (!toTokenAddress && toChainId !== 1337) {
      const lifiTokenAddress = await getTokenFromLiFi(toChainId, params.toToken)
      if (lifiTokenAddress) {
        toTokenAddress = lifiTokenAddress
      }
    }

    // CRITICAL: Never use zero address for Hyperliquid tokens
    // Hyperliquid uses USDC as its native token, not ETH
    if (toChainId === 1337 && toTokenAddress === '0x0000000000000000000000000000000000000000') {
      // If trying to send ETH to Hyperliquid, this is invalid - Hyperliquid doesn't have ETH
      if (params.toToken === 'ETH' || params.toToken === 'WETH') {
        throw new Error(`ETH is not available on Hyperliquid. Please select USDC as the destination token. Hyperliquid uses USDC as its native token.`)
      }
      
      console.error('Invalid zero address for Hyperliquid token. Attempting LiFi API lookup...')
      const lifiTokenAddress = await getTokenFromLiFi(toChainId, params.toToken)
      if (lifiTokenAddress) {
        toTokenAddress = lifiTokenAddress
      } else {
        throw new Error(`Token ${params.toToken} is not available on Hyperliquid. Please select USDC as the destination token.`)
      }
    }

    if (!fromTokenAddress || !toTokenAddress) {
      const missingTokens = []
      if (!fromTokenAddress) missingTokens.push(`${params.fromToken} on ${params.fromChain}`)
      if (!toTokenAddress) missingTokens.push(`${params.toToken} on ${params.toChain}`)
      
      console.error('Token not found:', {
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromChain: params.fromChain,
        toChain: params.toChain,
        fromTokenAddress,
        toTokenAddress,
        missingTokens
      })
      
      // Throw error with helpful message
      throw new Error(`Token${missingTokens.length > 1 ? 's' : ''} not found: ${missingTokens.join(', ')}. Please select a different token.`)
    }

    const decimals = params.fromToken === 'ETH' ? 18 : 6
    const fromAmountWei = BigInt(Math.floor(parseFloat(params.fromAmount) * 10 ** decimals)).toString()

    const slippage = params.slippage || 0.03

    const response = await fetch(`${LIFI_API_BASE}/advanced/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromChainId,
        toChainId,
        fromTokenAddress,
        toTokenAddress,
        fromAmount: fromAmountWei,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        options: {
          slippage,
          // Enable messaging flow for Hyperliquid to support direct core account transfers
          // Also enable for routes to Arbitrum when the final destination is Hyperliquid
          executionType: (params.toChain === 'hpl' || params.toChain === 'hyperliquid' || params.toChain === 'arb') ? 'all' : undefined,
          ...(LIFI_INTEGRATOR_ID && { integrator: LIFI_INTEGRATOR_ID }),
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Unknown error'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorText
      } catch {
        errorMessage = errorText
      }
      console.error('LiFi routes API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      })
      // Throw error with message so it can be caught and displayed
      throw new Error(errorMessage || `LiFi routes API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data as RouteResponse
  } catch (error) {
    console.error('Error fetching routes:', error)
    return null
  }
}

/**
 * Get step transaction data (for messaging flow)
 */
export async function getStepTransaction(step: any): Promise<any> {
  try {
    // Extract tool from step if available, otherwise use toolDetails
    const tool = step.tool || step.toolDetails?.key || step.action?.tool
    
    if (!tool) {
      console.error('Step missing tool property:', step)
      throw new Error('Step is missing required tool property. Cannot fetch transaction data.')
    }
    
    const response = await fetch(`${LIFI_API_BASE}/advanced/stepTransaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool,
        step,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Unknown error'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorText
      } catch {
        errorMessage = errorText
      }
      console.error('LiFi stepTransaction API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      })
      throw new Error(errorMessage || `LiFi stepTransaction API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching step transaction:', error)
    throw error
  }
}

/**
 * Relay a signed message (for messaging flow)
 */
export async function relayMessage(step: any, signature: string): Promise<any> {
  try {
    const response = await fetch(`${LIFI_API_BASE}/advanced/relay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        step,
        signature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Unknown error'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorText
      } catch {
        errorMessage = errorText
      }
      console.error('LiFi relay API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      })
      throw new Error(errorMessage || `LiFi relay API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error relaying message:', error)
    throw error
  }
}

/**
 * Get transaction status
 */
export async function getStatus(txHash: string, fromChain?: number, toChain?: number): Promise<any> {
  try {
    const url = new URL(`${LIFI_API_BASE}/status`)
    url.searchParams.set('txHash', txHash)
    if (fromChain) url.searchParams.set('fromChain', fromChain.toString())
    if (toChain) url.searchParams.set('toChain', toChain.toString())

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching status:', error)
    return null
  }
}
