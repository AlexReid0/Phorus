// Direct Relay API integration for Hyperliquid transfers
// This bypasses LiFi and goes directly through Relay

const RELAY_API_BASE = 'https://api.relay.link'

export interface RelayQuote {
  quote: {
    fromChainId: number
    toChainId: number
    fromToken: string
    toToken: string
    fromAmount: string
    toAmount: string
    estimatedTime: number
    fee: {
      amount: string
      token: string
    }
  }
  transaction: {
    to: string
    value: string
    data: string
    gasLimit: string
    chainId: number
  }
}

export interface RelayQuoteParams {
  fromChainId: number
  toChainId: number // 1337 for Hyperliquid
  fromToken: string // Token address on source chain
  toToken: string // Token address on destination (USDC for Hyperliquid)
  fromAmount: string // Amount in smallest unit (wei, etc.)
  recipient: string // Hyperliquid core account address
  useDepositAddress?: boolean // For certain flows
}

/**
 * Get a quote from Relay API for direct Hyperliquid transfers
 */
export async function getRelayQuote(params: RelayQuoteParams): Promise<RelayQuote> {
  try {
    const response = await fetch(`${RELAY_API_BASE}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.fromAmount,
        recipient: params.recipient,
        useDepositAddress: params.useDepositAddress || false,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `Relay API error: ${response.status}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error('Error fetching Relay quote:', error)
    throw error
  }
}

/**
 * Get transaction status from Relay
 */
export async function getRelayStatus(txHash: string, fromChainId: number): Promise<any> {
  try {
    const response = await fetch(`${RELAY_API_BASE}/status?txHash=${txHash}&fromChainId=${fromChainId}`)
    
    if (!response.ok) {
      throw new Error(`Relay status API error: ${response.status}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error('Error fetching Relay status:', error)
    throw error
  }
}
