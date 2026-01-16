'use client'

import { useState, useEffect } from 'react'
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import ConnectWallet from './components/ConnectWallet'
import { getQuote, CHAIN_IDS, TOKEN_ADDRESSES } from './utils/lifi'

interface Chain {
  id: string
  name: string
  icon: string
}

interface Token {
  symbol: string
  name: string
  balance: string
  icon: string
}

const chains: Chain[] = [
  { id: 'ethereum', name: 'Ethereum', icon: '⟠' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '🔷' },
  { id: 'optimism', name: 'Optimism', icon: '🔴' },
  { id: 'base', name: 'Base', icon: '🔵' },
  { id: 'hyperliquid', name: 'Hyperliquid', icon: '⚡' },
]

const tokens: Token[] = [
  { symbol: 'USDC', name: 'USD Coin', balance: '0.00', icon: '💵' },
  { symbol: 'USDT', name: 'Tether', balance: '0.00', icon: '💵' },
  { symbol: 'ETH', name: 'Ethereum', balance: '0.00', icon: '⟠' },
]

export default function BridgePage() {
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({ address })
  
  const [fromChain, setFromChain] = useState<Chain>(chains[0])
  const [toChain, setToChain] = useState<Chain>(chains[4]) // Hyperliquid
  const [fromToken, setFromToken] = useState<Token>(tokens[0])
  const [toToken, setToToken] = useState<Token>(tokens[0])
  const [amount, setAmount] = useState<string>('')
  const [hyperliquidAddress, setHyperliquidAddress] = useState<string>('')
  
  // Quote state
  const [quote, setQuote] = useState<any>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  
  // Transaction state
  const { sendTransaction, data: txHash, isPending: isPendingTx, error: txError } = useSendTransaction()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

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
        const quoteData = await getQuote({
          fromChain: fromChain.id,
          toChain: toChain.id,
          fromToken: fromToken.symbol,
          toToken: toToken.symbol,
          fromAmount: amount,
          fromAddress: address,
          toAddress: toChain.id === 'hyperliquid' && hyperliquidAddress ? hyperliquidAddress : address,
          slippage: 0.03, // 3% slippage
        })

        if (quoteData) {
          setQuote(quoteData)
        } else {
          setQuoteError('Unable to fetch quote. Please try again.')
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

  const handleBridge = async () => {
    if (!quote || !address || !isConnected) return

    try {
      const txRequest = quote.transactionRequest
      if (!txRequest) {
        setQuoteError('No transaction data available')
        return
      }

      // Execute the transaction using sendTransaction
      sendTransaction({
        to: txRequest.to as `0x${string}`,
        value: BigInt(txRequest.value || '0'),
        data: txRequest.data as `0x${string}`,
        gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
        gasPrice: txRequest.gasPrice ? BigInt(txRequest.gasPrice) : undefined,
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
    <main className="min-h-screen relative overflow-hidden">
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
              </div>
              
              <div className="flex gap-3">
                {/* Chain Selector */}
                <div className="relative flex-1 group">
                  <select
                    value={fromChain.id}
                    onChange={(e) => setFromChain(chains.find(c => c.id === e.target.value) || chains[0])}
                    className="bridge-select w-full px-4 py-4 rounded-xl appearance-none cursor-pointer text-base font-medium transition-all hover:border-mint/30 focus:border-mint/40"
                  >
                    {chains.map((chain) => (
                      <option key={chain.id} value={chain.id} className="bg-deep-green">
                        {chain.icon} {chain.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110">
                    <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Token Selector */}
                <div className="relative flex-1 group">
                  <select
                    value={fromToken.symbol}
                    onChange={(e) => setFromToken(tokens.find(t => t.symbol === e.target.value) || tokens[0])}
                    className="bridge-select w-full px-4 py-4 rounded-xl appearance-none cursor-pointer text-base font-medium transition-all hover:border-mint/30 focus:border-mint/40"
                  >
                    {tokens.map((token) => (
                      <option key={token.symbol} value={token.symbol} className="bg-deep-green">
                        {token.icon} {token.symbol}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110">
                    <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
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
                className="bg-deep-green border-2 border-mint/30 rounded-full p-3 hover:border-mint/50 transition-all hover:scale-110"
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
              
              <div className="flex gap-3">
                {/* Chain Selector */}
                <div className="relative flex-1 group">
                  <select
                    value={toChain.id}
                    onChange={(e) => setToChain(chains.find(c => c.id === e.target.value) || chains[0])}
                    className="bridge-select w-full px-4 py-4 rounded-xl appearance-none cursor-pointer text-base font-medium transition-all hover:border-mint/30 focus:border-mint/40"
                  >
                    {chains.map((chain) => (
                      <option key={chain.id} value={chain.id} className="bg-deep-green">
                        {chain.icon} {chain.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110">
                    <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Token Selector */}
                <div className="relative flex-1 group">
                  <select
                    value={toToken.symbol}
                    onChange={(e) => setToToken(tokens.find(t => t.symbol === e.target.value) || tokens[0])}
                    className="bridge-select w-full px-4 py-4 rounded-xl appearance-none cursor-pointer text-base font-medium transition-all hover:border-mint/30 focus:border-mint/40"
                  >
                    {tokens.map((token) => (
                      <option key={token.symbol} value={token.symbol} className="bg-deep-green">
                        {token.icon} {token.symbol}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110">
                    <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
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

            {/* Bridge Button */}
            <button
              disabled={
                !isConnected || 
                !amount || 
                parseFloat(amount) <= 0 || 
                loadingQuote || 
                !quote || 
                isPendingTx || 
                isConfirming
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
                : isPendingTx || isConfirming
                ? isConfirming ? 'Confirming...' : 'Processing...'
                : isConfirmed
                ? 'Bridge Complete!'
                : 'Bridge'}
            </button>
            
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

          {/* Footer Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Bridge directly to Hyperliquid with minimal fees</p>
          </div>
        </div>
      </div>
    </main>
  )
}
