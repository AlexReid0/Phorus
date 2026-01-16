'use client'

import { useAccount, useDisconnect, useBalance } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { formatAddress, formatBalance } from '../utils/format'
import { useState, useEffect } from 'react'

export default function ConnectWallet() {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()
  const { data: balance } = useBalance({
    address,
  })

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return

    const handleClickOutside = () => setIsDropdownOpen(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isDropdownOpen])

  if (!mounted) {
    return (
      <div className="pill-button text-sm px-6 py-2 animate-pulse">
        <div className="w-24 h-4 bg-white/20 rounded"></div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <button
        onClick={() => open()}
        className="pill-button text-sm px-6 py-2"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsDropdownOpen(!isDropdownOpen)
        }}
        className="pill-button text-sm px-4 py-2 flex items-center gap-2 bg-mint/10 border border-mint/30 hover:bg-mint/20 text-mint"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="font-mono">{formatAddress(address!)}</span>
          {balance && (
            <span className="text-xs opacity-75">
              {formatBalance(balance.formatted)} {balance.symbol}
            </span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-mint/20 bg-deep-green/95 backdrop-blur-lg shadow-xl z-50 overflow-hidden">
          {/* Account Info */}
          <div className="p-4 border-b border-mint/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Connected</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-xs text-green-400">Active</span>
              </div>
            </div>
            <div className="flex items-center justify-between mb-1">
              <div className="font-mono text-sm text-white">{formatAddress(address!)}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (address) {
                    navigator.clipboard.writeText(address)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }
                }}
                className="text-xs text-mint hover:text-mint-dark transition-colors px-2 py-1 rounded hover:bg-mint/10"
                title="Copy address"
              >
                {copied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            {balance && (
              <div className="text-xs text-gray-400">
                {formatBalance(balance.formatted)} {balance.symbol}
              </div>
            )}
          </div>

          {/* Chain Info */}
          {chain && (
            <div className="p-4 border-b border-mint/10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Network</span>
                <span className="text-sm text-white font-medium">{chain.name}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => {
                open({ view: 'Account' })
                setIsDropdownOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-mint hover:bg-mint/10 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Account Settings
              </div>
            </button>
            <button
              onClick={() => {
                open({ view: 'Networks' })
                setIsDropdownOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-mint hover:bg-mint/10 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                Switch Network
              </div>
            </button>
            <button
              onClick={() => {
                disconnect()
                setIsDropdownOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
