'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt, useWriteContract, useSwitchChain } from 'wagmi'
import { formatUnits, parseUnits, erc20Abi } from 'viem'
import ConnectWallet from './components/ConnectWallet'
import ChainIcon from './components/ChainIcon'
import TokenIcon from './components/TokenIcon'
import { getQuote, getRoutes, CHAIN_IDS, TOKEN_ADDRESSES } from './utils/lifi'

interface Chain {
  id: string
  name: string
}

interface Token {
  symbol: string
  name: string
}

const chains: Chain[] = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'base', name: 'Base' },
  { id: 'hyperliquid', name: 'Hyperliquid' },
]

// Tokens available per chain
const getTokensForChain = (chainId: string): Token[] => {
  const chainTokens: Record<string, Token[]> = {
    ethereum: [
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'USDT', name: 'Tether' },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
      { symbol: 'DAI', name: 'Dai Stablecoin' },
      { symbol: 'WETH', name: 'Wrapped Ethereum' },
    ],
    arbitrum: [
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'USDT', name: 'Tether' },
      { symbol: 'ARB', name: 'Arbitrum' },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
      { symbol: 'WETH', name: 'Wrapped Ethereum' },
    ],
    optimism: [
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'USDT', name: 'Tether' },
      { symbol: 'OP', name: 'Optimism' },
      { symbol: 'WETH', name: 'Wrapped Ethereum' },
    ],
    base: [
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'USDT', name: 'Tether' },
      { symbol: 'WETH', name: 'Wrapped Ethereum' },
    ],
    hyperliquid: [
      { symbol: 'USDC', name: 'USD Coin' },
      { symbol: 'USDT', name: 'Tether' },
      { symbol: 'ETH', name: 'Ethereum' },
    ],
  }
  
  return chainTokens[chainId] || chainTokens.ethereum
}

export default function BridgePage() {
  const { address, isConnected, chain } = useAccount()
  
  const [fromChain, setFromChain] = useState<Chain>(chains[0])
  const [toChain, setToChain] = useState<Chain>(chains[4]) // Hyperliquid
  const [fromToken, setFromToken] = useState<Token>(getTokensForChain(chains[0].id)[0])
  const [toToken, setToToken] = useState<Token>(getTokensForChain(chains[4].id)[0])
  const [amount, setAmount] = useState<string>('')
  const [hyperliquidAddress, setHyperliquidAddress] = useState<string>('')
  
  // State for unified selector
  const [showFromSelector, setShowFromSelector] = useState(false)
  const [showToSelector, setShowToSelector] = useState(false)
  const [fromSearchQuery, setFromSearchQuery] = useState('')
  const [toSearchQuery, setToSearchQuery] = useState('')
  const [fromChainFilter, setFromChainFilter] = useState<string | null>(null)
  const [toChainFilter, setToChainFilter] = useState<string | null>(null)
  
  // Get native balance
  const { data: nativeBalance } = useBalance({ address })
  
  // Get token balance when a token is selected (not ETH)
  // Compute token address based on current chain and token symbol
  const tokenAddress = useMemo(() => {
    if (fromToken.symbol === 'ETH') return undefined
    const chainTokens = TOKEN_ADDRESSES[fromChain.id]
    const address = chainTokens?.[fromToken.symbol] || TOKEN_ADDRESSES['ethereum']?.[fromToken.symbol]
    // For Hyperliquid USDT, use the same address as USDC for now (may need to be updated when USDT is fully enabled)
    if (fromChain.id === 'hyperliquid' && fromToken.symbol === 'USDT') {
      // USDT on Hyperliquid may use the same contract as USDC or may not be fully enabled yet
      return chainTokens?.['USDC'] as `0x${string}` | undefined
    }
    return address as `0x${string}` | undefined
  }, [fromChain.id, fromToken.symbol])
  
  const { data: tokenBalance, isLoading: isLoadingTokenBalance } = useBalance({
    address,
    token: tokenAddress,
    query: {
      enabled: !!tokenAddress && isConnected && !!fromToken.symbol && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  })
  
  // Use token balance if available, otherwise native balance (only for ETH)
  // If token is not ETH and we don't have a valid token address or balance, show null/zero
  const balance = useMemo(() => {
    if (fromToken.symbol === 'ETH') {
      return nativeBalance
    }
    // If we have a token address but no balance data yet, return undefined to show loading
    if (tokenAddress && isLoadingTokenBalance) {
      return undefined
    }
    // If we have token balance, use it
    if (tokenBalance) {
      return tokenBalance
    }
    // If no token address (e.g., unsupported token on chain), return null to show no balance
    if (!tokenAddress) {
      return null
    }
    // Fallback to native balance only if token query completed but returned no balance
    return nativeBalance
  }, [fromToken.symbol, tokenAddress, tokenBalance, nativeBalance, isLoadingTokenBalance])
  
  // Quote state
  const [quote, setQuote] = useState<any>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  
  // Transaction state
  const { sendTransaction, data: txHash, isPending: isPendingTx, error: txError } = useSendTransaction()
  const { writeContract: writeApproval, data: approvalHash, isPending: isApproving } = useWriteContract()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalHash,
  })
  
  // Approval state
  const [needsApproval, setNeedsApproval] = useState(false)
  const [chainMismatch, setChainMismatch] = useState(false)
  
  // Store transaction details for success popup
  const [successDetails, setSuccessDetails] = useState<{
    fromToken: string
    toChain: string
  } | null>(null)
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.selector-dropdown')) {
        setShowFromSelector(false)
        setShowToSelector(false)
      }
    }
    if (showFromSelector || showToSelector) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showFromSelector, showToSelector])

  // Reset form when bridge is complete (but keep success details for popup)
  useEffect(() => {
    if (isConfirmed && txHash) {
      // Store details before resetting
      setSuccessDetails({
        fromToken: fromToken.symbol,
        toChain: toChain.name,
      })
      
      // Reset form after a short delay to show popup
      const timer = setTimeout(() => {
        setAmount('')
        setQuote(null)
        setQuoteError(null)
        setNeedsApproval(false)
        setChainMismatch(false)
        setSuccessDetails(null)
      }, 5000) // Show popup for 5 seconds
      
      return () => clearTimeout(timer)
    }
  }, [isConfirmed, txHash, fromToken.symbol, toChain.name])

  // Update token when chain changes to ensure token exists on new chain
  useEffect(() => {
    const availableTokens = getTokensForChain(fromChain.id)
    const currentTokenExists = availableTokens.some(t => t.symbol === fromToken.symbol)
    if (!currentTokenExists) {
      setFromToken(availableTokens[0] || { symbol: 'ETH', name: 'Ethereum' })
    }
  }, [fromChain.id])

  useEffect(() => {
    const availableTokens = getTokensForChain(toChain.id)
    const currentTokenExists = availableTokens.some(t => t.symbol === toToken.symbol)
    if (!currentTokenExists) {
      setToToken(availableTokens[0] || { symbol: 'USDC', name: 'USD Coin' })
    }
  }, [toChain.id])

  // Fetch quote when parameters change
  useEffect(() => {
    if (!isConnected || !address || !amount || parseFloat(amount) <= 0) {
      setQuote(null)
      return
    }

    const fetchQuote = async () => {
      setLoadingQuote(true)
      setQuoteError(null)
      
      try {
        // Try to get advanced routes first to find direct routes
        const routesData = await getRoutes({
          fromChain: fromChain.id,
          toChain: toChain.id,
          fromToken: fromToken.symbol,
          toToken: toToken.symbol,
          fromAmount: amount,
          fromAddress: address,
          toAddress: toChain.id === 'hyperliquid' && hyperliquidAddress ? hyperliquidAddress : address,
          slippage: 0.03,
        })

        let quoteData = null

        // If we have routes, try to find one that executes on the fromChain
        if (routesData && routesData.routes && routesData.routes.length > 0) {
          // Find a route where the first step executes on fromChain
          const directRoute = routesData.routes.find((route: any) => {
            const firstStep = route.steps[0]
            return firstStep && firstStep.action.fromChainId === CHAIN_IDS[fromChain.id]
          })

          if (directRoute && directRoute.steps && directRoute.steps.length > 0) {
            // Use the first step as our quote
            const firstStep = directRoute.steps[0]
            // We'll need to get the transaction for this step
            // For now, fall back to simple quote
          }
        }

        // Fall back to simple quote if no direct route found
        if (!quoteData) {
          quoteData = await getQuote({
            fromChain: fromChain.id,
            toChain: toChain.id,
            fromToken: fromToken.symbol,
            toToken: toToken.symbol,
            fromAmount: amount,
            fromAddress: address,
            toAddress: toChain.id === 'hyperliquid' && hyperliquidAddress ? hyperliquidAddress : address,
            slippage: 0.03, // 3% slippage
          })
        }

        if (quoteData) {
          // CRITICAL: Reject quote if it's not on the fromChain
          const requiredChainId = quoteData.transactionRequest?.chainId || quoteData.action.fromChainId
          const expectedChainId = CHAIN_IDS[fromChain.id]
          
          if (requiredChainId !== expectedChainId) {
            const wrongChainName = Object.keys(CHAIN_IDS).find(key => CHAIN_IDS[key] === requiredChainId) || `Chain ${requiredChainId}`
            setQuoteError(`❌ This route requires ${wrongChainName} instead of ${fromChain.name}. Please try again or select a different route.`)
            setQuote(null)
            setNeedsApproval(false)
            console.error('Quote rejected - wrong chain:', {
              expected: expectedChainId,
              got: requiredChainId,
              fromChain: fromChain.name
            })
            return
          }
          
          setQuote(quoteData)
          setQuoteError(null)
          
          // Check if approval is needed
          if (quoteData.estimate.approvalAddress && fromToken.symbol !== 'ETH') {
            setNeedsApproval(true)
          } else {
            setNeedsApproval(false)
          }
        } else {
          setQuoteError('Unable to fetch quote. Please try again.')
          setNeedsApproval(false)
        }
      } catch (error) {
        console.error('Error fetching quote:', error)
        setQuoteError('Error fetching quote. Please try again.')
      } finally {
        setLoadingQuote(false)
      }
    }

    // Debounce quote fetching
    const timeoutId = setTimeout(fetchQuote, 500)
    return () => clearTimeout(timeoutId)
  }, [isConnected, address, fromChain, toChain, fromToken, toToken, amount, hyperliquidAddress])

  const handleSwapChains = () => {
    const temp = fromChain
    setFromChain(toChain)
    setToChain(temp)
  }

  const handleApproval = async () => {
    if (!quote || !address || !isConnected || !quote.estimate.approvalAddress) return

    try {
      const tokenAddress = quote.action.fromToken.address as `0x${string}`
      const approvalAddress = quote.estimate.approvalAddress as `0x${string}`
      const amount = BigInt(quote.action.fromAmount)

      writeApproval({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [approvalAddress, amount],
      })
    } catch (error: any) {
      console.error('Error approving token:', error)
      setQuoteError(error?.message || 'Failed to approve token')
    }
  }

  const handleBridge = async () => {
    if (!quote || !address || !isConnected) return

    // If approval is needed and not confirmed, don't proceed
    if (needsApproval && quote.estimate.approvalAddress && !isApprovalConfirmed) {
      setQuoteError('Please approve the token first')
      return
    }

    try {
      const txRequest = quote.transactionRequest
      if (!txRequest) {
        setQuoteError('No transaction data available')
        return
      }

      // Check if user is on the correct chain
      // The transaction should be on the fromChain, not any intermediate chain
      const expectedChainId = CHAIN_IDS[fromChain.id]
      const requiredChainId = txRequest.chainId || quote.action.fromChainId
      const currentChainId = chain?.id

      console.log('Chain check:', {
        fromChain: fromChain.name,
        expectedChainId,
        requiredChainId,
        currentChainId,
        txRequestChainId: txRequest.chainId
      })

      // CRITICAL: Reject if the transaction is not on the fromChain
      // This prevents signing on the wrong network (e.g., Ethereum when bridging from Base)
      if (requiredChainId !== expectedChainId) {
        setChainMismatch(true)
        const wrongChainName = Object.keys(CHAIN_IDS).find(key => CHAIN_IDS[key] === requiredChainId) || `Chain ${requiredChainId}`
        setQuoteError(`❌ Error: This route requires ${wrongChainName} instead of ${fromChain.name}. Please refresh to get a direct route.`)
        console.error('Chain mismatch - rejecting transaction:', {
          expected: expectedChainId,
          got: requiredChainId,
          fromChain: fromChain.name,
          txRequest: txRequest
        })
        return // BLOCK the transaction
      }

      // Check if user is on the correct chain
      if (currentChainId !== requiredChainId) {
        setChainMismatch(true)
        const chainName = Object.keys(CHAIN_IDS).find(key => CHAIN_IDS[key] === requiredChainId) || `Chain ${requiredChainId}`
        setQuoteError(`Please switch to ${chainName} (Chain ID: ${requiredChainId}) to execute this transaction`)
        
        // Try to switch chain automatically
        if (switchChain && requiredChainId) {
          try {
            const result = switchChain({ chainId: requiredChainId as number })
            if (result && typeof result.then === 'function') {
              await result
            }
            setChainMismatch(false)
            setQuoteError(null)
            // Wait a moment for chain switch, then retry
            setTimeout(() => {
              handleBridge()
            }, 1000)
            return
          } catch (switchError: any) {
            console.error('Error switching chain:', switchError)
            setQuoteError(`Please manually switch to ${chainName} in your wallet`)
            return
          }
        }
        return
      }

      setChainMismatch(false)

      // Execute the transaction using sendTransaction
      // Use EIP-1559 format (maxFeePerGas) instead of gasPrice
      sendTransaction({
        to: txRequest.to as `0x${string}`,
        value: BigInt(txRequest.value || '0'),
        data: txRequest.data as `0x${string}`,
        gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
        // Don't set gasPrice - let wagmi handle it with EIP-1559
      })
    } catch (error: any) {
      console.error('Error executing bridge:', error)
      setQuoteError(error?.message || 'Failed to execute bridge transaction')
    }
  }

  // Format output amount from quote
  const getOutputAmount = () => {
    if (quote?.estimate?.toAmount) {
      const decimals = toToken.symbol === 'ETH' ? 18 : 6
      return formatUnits(BigInt(quote.estimate.toAmount), decimals)
    }
    if (amount) {
      return (parseFloat(amount) * 0.999).toFixed(4)
    }
    return '0.00'
  }

  // Get fee info from quote
  const getFeeInfo = () => {
    if (quote?.estimate?.feeCosts && quote.estimate.feeCosts.length > 0) {
      const totalFee = quote.estimate.feeCosts.reduce((sum: number, fee: any) => {
        return sum + parseFloat(fee.amountUSD || '0')
      }, 0)
      return totalFee.toFixed(4)
    }
    return '0.1%'
  }

  return (
    <main className="min-h-screen relative overflow-x-hidden">
      {/* Fluid gradient background */}
      <div className="fluid-gradient" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-serif font-light italic text-white">Phorus</h1>
            <ConnectWallet />
          </div>

          {/* Bridge Card */}
          <div className="bridge-card rounded-3xl p-6 md:p-8 space-y-6">
            {/* From Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400 font-medium">From</label>
                {isConnected && balance && (
                  <span className="text-xs text-gray-500">
                    Balance: {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                  </span>
                )}
                {isConnected && balance === null && fromToken.symbol !== 'ETH' && (
                  <span className="text-xs text-gray-500">
                    Balance: 0.0000 {fromToken.symbol}
                  </span>
                )}
              </div>
              
              {/* Unified Chain/Token Selector */}
              <div className="relative selector-dropdown">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFromSelector(!showFromSelector)
                  }}
                  className="bridge-select w-full px-4 py-4 rounded-xl flex items-center gap-3 cursor-pointer text-base font-medium transition-all hover:border-mint/30"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <TokenIcon symbol={fromToken.symbol} size={32} chainId={fromChain.id} />
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">{fromToken.symbol}</div>
                      <div className="text-xs text-gray-400">{fromChain.name}</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showFromSelector && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-mint/20 rounded-xl overflow-hidden z-50 max-h-96 flex flex-col">
                    {/* Search Bar */}
                    <div className="p-3 border-b border-mint/10">
                      <input
                        type="text"
                        placeholder="Search token and chain"
                        value={fromSearchQuery}
                        onChange={(e) => {
                          e.stopPropagation()
                          setFromSearchQuery(e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-4 py-2 bg-black border border-mint/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-mint/40"
                      />
                    </div>
                    
                    {/* Chain Filter Buttons */}
                    <div className="p-2 flex gap-2 overflow-x-auto border-b border-mint/10 scrollbar-hide">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setFromChainFilter(null)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                          fromChainFilter === null
                            ? 'bg-mint/20 text-mint border border-mint/30'
                            : 'bg-black/50 text-gray-400 border border-mint/10 hover:border-mint/20'
                        }`}
                      >
                        All
                      </button>
                      {chains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setFromChainFilter(chain.id)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
                            fromChainFilter === chain.id
                              ? 'bg-mint/20 text-mint border border-mint/30'
                              : 'bg-black/50 text-gray-400 border border-mint/10 hover:border-mint/20'
                          }`}
                        >
                          <ChainIcon chainId={chain.id} size={16} />
                          {chain.name}
                        </button>
                      ))}
                    </div>
                    
                    {/* Token List */}
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {(() => {
                        // Filter tokens based on search and chain filter
                        const filteredChains = fromChainFilter
                          ? chains.filter(c => c.id === fromChainFilter)
                          : chains
                        
                        const allTokens = filteredChains.flatMap(chain => 
                          getTokensForChain(chain.id)
                            .filter(token => 
                              !fromSearchQuery || 
                              token.symbol.toLowerCase().includes(fromSearchQuery.toLowerCase()) ||
                              token.name.toLowerCase().includes(fromSearchQuery.toLowerCase()) ||
                              chain.name.toLowerCase().includes(fromSearchQuery.toLowerCase())
                            )
                            .map(token => ({ ...token, chain }))
                        )
                        
                        // Remove duplicates by symbol
                        const uniqueTokens = Array.from(
                          new Map(allTokens.map(t => [t.symbol, t])).values()
                        )
                        
                        if (uniqueTokens.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500 text-sm">
                              No tokens found
                            </div>
                          )
                        }
                        
                        return uniqueTokens.map(({ symbol, name, chain: tokenChain }) => (
                          <button
                            key={`${tokenChain.id}-${symbol}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setFromChain(tokenChain)
                              // Use the clicked token, but verify it exists on the chain
                              const availableTokens = getTokensForChain(tokenChain.id)
                              const selectedToken = availableTokens.find(t => t.symbol === symbol) || availableTokens[0]
                              setFromToken(selectedToken)
                              setFromSearchQuery('')
                              setFromChainFilter(null)
                              setShowFromSelector(false)
                              setQuote(null)
                              setQuoteError(null)
                              if (isConnected && switchChain) {
                                const chainId = CHAIN_IDS[tokenChain.id]
                                if (chainId && chain?.id !== chainId) {
                                  try {
                                    const result = switchChain({ chainId })
                                    if (result && typeof result.catch === 'function') {
                                      result.catch(() => {})
                                    }
                                  } catch (error) {
                                    // Silently handle switch chain errors
                                    console.error('Error switching chain:', error)
                                  }
                                }
                              }
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-mint/10 rounded-lg transition-colors ${
                              fromToken.symbol === symbol && fromChain.id === tokenChain.id ? 'bg-mint/10' : ''
                            }`}
                          >
                            <TokenIcon symbol={symbol} size={24} chainId={tokenChain.id} />
                            <div className="flex-1 text-left">
                              <div className="text-white font-medium">{symbol}</div>
                              <div className="text-xs text-gray-400">{name} • {tokenChain.name}</div>
                            </div>
                          </button>
                        ))
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bridge-input w-full px-4 py-5 rounded-xl text-2xl font-semibold placeholder-gray-600"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                  <button
                    onClick={() => {
                      if (balance) {
                        const percent = parseFloat(balance.formatted) * 0.25
                        setAmount(percent.toString())
                      }
                    }}
                    className="text-xs text-mint hover:text-mint-dark px-2 py-1 rounded"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => {
                      if (balance) {
                        const percent = parseFloat(balance.formatted) * 0.5
                        setAmount(percent.toString())
                      }
                    }}
                    className="text-xs text-mint hover:text-mint-dark px-2 py-1 rounded"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => {
                      if (balance) {
                        setAmount(balance.formatted)
                      }
                    }}
                    className="text-xs text-mint hover:text-mint-dark px-2 py-1 rounded"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center -my-2">
              <button
                onClick={handleSwapChains}
                className="bg-black border-2 border-mint/30 rounded-full p-3 hover:border-mint/50 transition-all hover:scale-110"
              >
                <svg className="w-6 h-6 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* To Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400 font-medium">To</label>
                {isConnected && (
                  <span className="text-xs text-gray-500">
                    Hyperliquid Account
                  </span>
                )}
              </div>
              
              {/* Unified Chain/Token Selector */}
              <div className="relative selector-dropdown">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowToSelector(!showToSelector)
                  }}
                  className="bridge-select w-full px-4 py-4 rounded-xl flex items-center gap-3 cursor-pointer text-base font-medium transition-all hover:border-mint/30"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <TokenIcon symbol={toToken.symbol} size={32} chainId={toChain.id} />
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">{toToken.symbol}</div>
                      <div className="text-xs text-gray-400">{toChain.name}</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showToSelector && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-mint/20 rounded-xl overflow-hidden z-50 max-h-96 flex flex-col">
                    {/* Search Bar */}
                    <div className="p-3 border-b border-mint/10">
                      <input
                        type="text"
                        placeholder="Search token and chain"
                        value={toSearchQuery}
                        onChange={(e) => {
                          e.stopPropagation()
                          setToSearchQuery(e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-4 py-2 bg-black border border-mint/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-mint/40"
                      />
                    </div>
                    
                    {/* Chain Filter Buttons */}
                    <div className="p-2 flex gap-2 overflow-x-auto border-b border-mint/10 scrollbar-hide">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setToChainFilter(null)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                          toChainFilter === null
                            ? 'bg-mint/20 text-mint border border-mint/30'
                            : 'bg-black/50 text-gray-400 border border-mint/10 hover:border-mint/20'
                        }`}
                      >
                        All
                      </button>
                      {chains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setToChainFilter(chain.id)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
                            toChainFilter === chain.id
                              ? 'bg-mint/20 text-mint border border-mint/30'
                              : 'bg-black/50 text-gray-400 border border-mint/10 hover:border-mint/20'
                          }`}
                        >
                          <ChainIcon chainId={chain.id} size={16} />
                          {chain.name}
                        </button>
                      ))}
                    </div>
                    
                    {/* Token List */}
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {(() => {
                        // Filter tokens based on search and chain filter
                        const filteredChains = toChainFilter
                          ? chains.filter(c => c.id === toChainFilter)
                          : chains
                        
                        const allTokens = filteredChains.flatMap(chain => 
                          getTokensForChain(chain.id)
                            .filter(token => 
                              !toSearchQuery || 
                              token.symbol.toLowerCase().includes(toSearchQuery.toLowerCase()) ||
                              token.name.toLowerCase().includes(toSearchQuery.toLowerCase()) ||
                              chain.name.toLowerCase().includes(toSearchQuery.toLowerCase())
                            )
                            .map(token => ({ ...token, chain }))
                        )
                        
                        // Remove duplicates by symbol
                        const uniqueTokens = Array.from(
                          new Map(allTokens.map(t => [t.symbol, t])).values()
                        )
                        
                        if (uniqueTokens.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500 text-sm">
                              No tokens found
                            </div>
                          )
                        }
                        
                        return uniqueTokens.map(({ symbol, name, chain: tokenChain }) => (
                          <button
                            key={`${tokenChain.id}-${symbol}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setToChain(tokenChain)
                              // Ensure token exists on the selected chain
                              const availableTokens = getTokensForChain(tokenChain.id)
                              const selectedToken = availableTokens.find(t => t.symbol === symbol) || availableTokens[0]
                              setToToken(selectedToken)
                              setToSearchQuery('')
                              setToChainFilter(null)
                              setShowToSelector(false)
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-mint/10 rounded-lg transition-colors ${
                              toToken.symbol === symbol && toChain.id === tokenChain.id ? 'bg-mint/10' : ''
                            }`}
                          >
                            <TokenIcon symbol={symbol} size={24} chainId={tokenChain.id} />
                            <div className="flex-1 text-left">
                              <div className="text-white font-medium">{symbol}</div>
                              <div className="text-xs text-gray-400">{name} • {tokenChain.name}</div>
                            </div>
                          </button>
                        ))
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Hyperliquid Wallet Address Input */}
              {toChain.id === 'hyperliquid' && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Hyperliquid Wallet Address (Optional)</label>
                  <input
                    type="text"
                    value={hyperliquidAddress}
                    onChange={(e) => setHyperliquidAddress(e.target.value)}
                    placeholder="Enter Hyperliquid address or leave empty for connected wallet"
                    className="bridge-input w-full px-4 py-3 rounded-xl text-sm placeholder-gray-600 focus:border-mint/40"
                  />
                </div>
              )}

              {/* Output Amount */}
              <div className="bridge-input w-full px-4 py-5 rounded-xl text-2xl font-semibold text-gray-400">
                {loadingQuote ? (
                  <span className="text-sm">Loading quote...</span>
                ) : quoteError ? (
                  <span className="text-sm text-red-400">{quoteError}</span>
                ) : (
                  getOutputAmount()
                )}
              </div>
            </div>

            {/* Bridge Info */}
            <div className="pt-4 border-t border-mint/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bridge Fee</span>
                <span className="text-white">
                  {quote?.estimate?.feeCosts ? `$${getFeeInfo()}` : '0.1%'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estimated Time</span>
                <span className="text-white">
                  {quote?.estimate?.executionDuration 
                    ? `~${Math.ceil(quote.estimate.executionDuration / 60)} min`
                    : '~2 min'}
                </span>
              </div>
              {quote?.estimate?.toAmountMin && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Minimum Received</span>
                  <span className="text-white text-xs">
                    {formatUnits(BigInt(quote.estimate.toAmountMin), toToken.symbol === 'ETH' ? 18 : 6)}
                  </span>
                </div>
              )}
            </div>

            {/* Approval Button (if needed) */}
            {needsApproval && quote?.estimate.approvalAddress && !isApprovalConfirmed && (
              <button
                disabled={!isConnected || !quote || isApproving || isApprovalConfirming}
                onClick={handleApproval}
                className="pill-button w-full text-lg py-5 mt-4 bg-yellow-500 hover:bg-yellow-600"
              >
                {isApproving || isApprovalConfirming 
                  ? isApprovalConfirming ? 'Confirming Approval...' : 'Approving...' 
                  : `Approve ${fromToken.symbol}`}
              </button>
            )}

            {/* Chain Mismatch Warning */}
            {chainMismatch && quote?.transactionRequest && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="text-sm text-yellow-400 mb-2">Chain Mismatch</div>
                <div className="text-xs text-yellow-300">
                  This transaction needs to be executed on {fromChain.name}. 
                  {switchChain && (
                    <button
                      onClick={() => {
                        const requiredChainId = quote.transactionRequest?.chainId || quote.action.fromChainId
                        if (requiredChainId && switchChain) {
                          try {
                            const result = switchChain({ chainId: requiredChainId as number })
                            if (result && typeof result.catch === 'function') {
                              result.catch((error: any) => {
                                console.error('Error switching chain:', error)
                              })
                            }
                          } catch (error) {
                            console.error('Error switching chain:', error)
                          }
                        }
                      }}
                      className="ml-2 underline hover:text-yellow-200"
                    >
                      Switch Chain
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bridge Button */}
            <button
              disabled={
                !isConnected || 
                !amount || 
                parseFloat(amount) <= 0 || 
                loadingQuote || 
                !quote || 
                (needsApproval && !isApprovalConfirmed) ||
                chainMismatch ||
                isPendingTx || 
                isConfirming ||
                isApproving ||
                isApprovalConfirming ||
                isSwitchingChain
              }
              onClick={handleBridge}
              className="pill-button w-full text-lg py-5 mt-4"
            >
              {!isConnected 
                ? 'Connect Wallet to Bridge' 
                : loadingQuote 
                ? 'Loading Quote...' 
                : !quote 
                ? 'Enter Amount' 
                : chainMismatch
                ? 'Switch Chain First'
                : needsApproval && !isApprovalConfirmed
                ? 'Approve Token First'
                : isSwitchingChain
                ? 'Switching Chain...'
                : isPendingTx || isConfirming
                ? isConfirming ? 'Confirming...' : 'Processing...'
                : isConfirmed
                ? 'Bridge Complete!'
                : 'Bridge'}
            </button>
            
            {/* Approval Transaction Status */}
            {approvalHash && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="text-sm text-yellow-400 mb-2">
                  {isApprovalConfirmed ? 'Approval Confirmed' : 'Approval Submitted'}
                </div>
                <a
                  href={`${chain?.blockExplorers?.default?.url}/tx/${approvalHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-yellow-400 hover:text-yellow-300 underline break-all"
                >
                  {approvalHash}
                </a>
              </div>
            )}
            
            {/* Transaction Status */}
            {txHash && (
              <div className="mt-4 p-4 bg-mint/10 border border-mint/30 rounded-xl">
                <div className="text-sm text-mint mb-2">Transaction Submitted</div>
                <a
                  href={`${chain?.blockExplorers?.default?.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-mint hover:text-mint-dark underline break-all"
                >
                  {txHash}
                </a>
              </div>
            )}
            
            {txError && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="text-sm text-red-400">Transaction Error</div>
                <div className="text-xs text-red-300 mt-1">
                  {txError.message || 'Transaction failed'}
                </div>
              </div>
            )}
          </div>

          {/* Success Popup */}
          {isConfirmed && txHash && successDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bridge-card rounded-3xl p-8 max-w-md w-full text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-mint/20 flex items-center justify-center">
                    <svg className="w-10 h-10 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-serif text-white">Bridge Successful!</h2>
                <p className="text-gray-400">
                  Your {successDetails.fromToken} has been bridged to {successDetails.toChain}
                </p>
                <div className="pt-4 space-y-2">
                  <a
                    href={`${chain?.blockExplorers?.default?.url}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-mint hover:text-mint-dark underline"
                  >
                    View on Explorer
                  </a>
                  <button
                    onClick={() => {
                      setAmount('')
                      setQuote(null)
                      setQuoteError(null)
                      setNeedsApproval(false)
                      setChainMismatch(false)
                      setSuccessDetails(null)
                    }}
                    className="pill-button w-full mt-4"
                  >
                    Bridge Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Bridge directly to Hyperliquid with minimal fees</p>
          </div>
        </div>
      </div>
    </main>
  )
}
