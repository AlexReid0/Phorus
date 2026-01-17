// LiFi API utility functions

const LIFI_API_BASE = 'https://li.quest/v1'

// Chain ID mapping (LiFi uses numeric chain IDs)
export const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  hyperliquid: 1337, // Hyperliquid L1 chain ID
}

// Common token addresses (mainnet addresses, will work on L2s via LiFi)
export const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  ethereum: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    ETH: '0x0000000000000000000000000000000000000000', // Native token
  },
  arbitrum: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    ETH: '0x0000000000000000000000000000000000000000',
  },
  optimism: {
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    ETH: '0x0000000000000000000000000000000000000000',
  },
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    ETH: '0x0000000000000000000000000000000000000000',
  },
  hyperliquid: {
    USDC: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', // Native USDC on Hyperliquid (HyperEVM)
    USDT: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', // USDT may use same contract or need verification
    ETH: '0x0000000000000000000000000000000000000000', // Not directly supported, would need wrapping
  },
}

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

    const fromTokenAddress = TOKEN_ADDRESSES[params.fromChain]?.[params.fromToken] ||
      TOKEN_ADDRESSES['ethereum']?.[params.fromToken]
    const toTokenAddress = TOKEN_ADDRESSES[params.toChain]?.[params.toToken] ||
      TOKEN_ADDRESSES['ethereum']?.[params.toToken]

    if (!fromTokenAddress || !toTokenAddress) {
      console.error('Token not found:', params.fromToken, params.toToken)
      return null
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
    url.searchParams.set('slippage', slippage.toString())

    const response = await fetch(url.toString())

    if (!response.ok) {
      const error = await response.text()
      console.error('LiFi API error:', error)
      return null
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

    const fromTokenAddress = TOKEN_ADDRESSES[params.fromChain]?.[params.fromToken] ||
      TOKEN_ADDRESSES['ethereum']?.[params.fromToken]
    const toTokenAddress = TOKEN_ADDRESSES[params.toChain]?.[params.toToken] ||
      TOKEN_ADDRESSES['ethereum']?.[params.toToken]

    if (!fromTokenAddress || !toTokenAddress) {
      console.error('Token not found:', params.fromToken, params.toToken)
      return null
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
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('LiFi routes API error:', error)
      return null
    }

    const data = await response.json()
    return data as RouteResponse
  } catch (error) {
    console.error('Error fetching routes:', error)
    return null
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
