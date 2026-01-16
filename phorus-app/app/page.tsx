'use client'

import { useState } from 'react'

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
  const [fromChain, setFromChain] = useState<Chain>(chains[0])
  const [toChain, setToChain] = useState<Chain>(chains[4]) // Hyperliquid
  const [fromToken, setFromToken] = useState<Token>(tokens[0])
  const [toToken, setToToken] = useState<Token>(tokens[0])
  const [amount, setAmount] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)

  const handleSwapChains = () => {
    const temp = fromChain
    setFromChain(toChain)
    setToChain(temp)
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
            <h1 className="text-3xl font-serif font-bold text-white">Phorus</h1>
            <button
              onClick={() => setIsConnected(!isConnected)}
              className={`pill-button text-sm px-6 py-2 ${isConnected ? 'bg-green-500 hover:bg-green-600' : ''}`}
            >
              {isConnected ? '0x1234...5678' : 'Connect Wallet'}
            </button>
          </div>

          {/* Bridge Card */}
          <div className="bridge-card rounded-3xl p-6 md:p-8 space-y-6">
            {/* From Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400 font-medium">From</label>
                {isConnected && (
                  <span className="text-xs text-gray-500">
                    Balance: {fromToken.balance} {fromToken.symbol}
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                {/* Chain Selector */}
                <div className="relative flex-1">
                  <select
                    value={fromChain.id}
                    onChange={(e) => setFromChain(chains.find(c => c.id === e.target.value) || chains[0])}
                    className="bridge-select w-full px-4 py-4 rounded-xl appearance-none cursor-pointer text-base font-medium"
                  >
                    {chains.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.icon} {chain.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Token Selector */}
                <div className="relative flex-1">
                  <select
                    value={fromToken.symbol}
                    onChange={(e) => setFromToken(tokens.find(t => t.symbol === e.target.value) || tokens[0])}
                    className="bridge-select w-full px-4 py-4 rounded-xl appearance-none cursor-pointer text-base font-medium"
                  >
                    {tokens.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.icon} {token.symbol}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
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
                    onClick={() => setAmount('25')}
                    className="text-xs text-mint hover:text-mint-dark px-2 py-1 rounded"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => setAmount('50')}
                    className="text-xs text-mint hover:text-mint-dark px-2 py-1 rounded"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setAmount('100')}
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
                    Balance: {toToken.balance} {toToken.symbol}
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                {/* Chain Selector */}
                <div className="relative flex-1">
                  <select
                    value={toChain.id}
                    onChange={(e) => setToChain(chains.find(c => c.id === e.target.value) || chains[0])}
                    className="bridge-select w-full px-4 py-4 rounded-xl appearance-none cursor-pointer text-base font-medium"
                  >
                    {chains.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.icon} {chain.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Token Selector */}
                <div className="relative flex-1">
                  <select
                    value={toToken.symbol}
                    onChange={(e) => setToToken(tokens.find(t => t.symbol === e.target.value) || tokens[0])}
                    className="bridge-select w-full px-4 py-4 rounded-xl appearance-none cursor-pointer text-base font-medium"
                  >
                    {tokens.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.icon} {token.symbol}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Output Amount */}
              <div className="bridge-input w-full px-4 py-5 rounded-xl text-2xl font-semibold text-gray-400">
                {amount ? (parseFloat(amount) * 0.999).toFixed(4) : '0.00'}
              </div>
            </div>

            {/* Bridge Info */}
            <div className="pt-4 border-t border-mint/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bridge Fee</span>
                <span className="text-white">0.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estimated Time</span>
                <span className="text-white">~2 min</span>
              </div>
            </div>

            {/* Bridge Button */}
            <button
              disabled={!isConnected || !amount || parseFloat(amount) <= 0}
              className="pill-button w-full text-lg py-5 mt-4"
            >
              {!isConnected ? 'Connect Wallet to Bridge' : 'Bridge'}
            </button>
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
