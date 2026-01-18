'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt, useWriteContract, useSwitchChain, useSignTypedData } from 'wagmi'
import { formatUnits, parseUnits, erc20Abi, isAddress, getAddress } from 'viem'
import Link from 'next/link'
import ConnectWallet from './components/ConnectWallet'
import ChainIcon from './components/ChainIcon'
import TokenIcon from './components/TokenIcon'
import { getQuote, getRoutes, getStepTransaction, relayMessage, CHAIN_IDS, TOKEN_ADDRESSES } from './utils/lifi'
import { Token, POPULAR_TOKENS, POPULAR_CHAINS, getTokensForChain } from './utils/tokens'

interface Chain {
  id: string
  name: string
}

// Import chains from generated file
import { chainsArray } from '../scripts/generated-chains'

// Use all chains from LiFi, sorted by popularity
// Map chains to our Chain interface, using lifiKey for id (LiFi key like 'eth', 'arb', 'hpl')
const chains: Chain[] = chainsArray
  .map((chain: any) => ({
    id: chain.lifiKey || String(chain.id) || 'eth', // LiFi key (e.g., 'eth', 'arb', 'hpl')
    name: chain.name || 'Unknown Chain',
  }))
  .sort((a, b) => {
    // Get index in popular chains (lower index = more popular)
    const aPopularIndex = POPULAR_CHAINS.indexOf(a.id)
    const bPopularIndex = POPULAR_CHAINS.indexOf(b.id)

    // Both are popular - sort by popularity order
    if (aPopularIndex !== -1 && bPopularIndex !== -1) {
      return aPopularIndex - bPopularIndex
    }

    // Only a is popular - a comes first
    if (aPopularIndex !== -1) {
      return -1
    }

    // Only b is popular - b comes first
    if (bPopularIndex !== -1) {
      return 1
    }

    // Neither is popular - sort alphabetically by name
    return a.name.localeCompare(b.name)
  })
export default function BridgePage() {
  const { address, isConnected, chain } = useAccount()

  // Find Hyperliquid chain (hpl key = 1337)
  const hyperliquidChain = chains.find(c => (c as any).id === 'hpl') || chains[0]
  const [fromChain, setFromChain] = useState<Chain>(chains[0])
  const [toChain, setToChain] = useState<Chain>(hyperliquidChain)
  const [fromToken, setFromToken] = useState<Token>(getTokensForChain((chains[0] as any).id || 'eth')[0])
  const [toToken, setToToken] = useState<Token>(getTokensForChain((hyperliquidChain as any).id || 'hpl')[0])
  const [amount, setAmount] = useState<string>('')
  const [hyperliquidAddress, setHyperliquidAddress] = useState<string>('')
  const [useCurrentWallet, setUseCurrentWallet] = useState<boolean>(false)
  const [isMounted, setIsMounted] = useState(false)

  // State for unified selector
  const [showFromSelector, setShowFromSelector] = useState(false)
  const [showToSelector, setShowToSelector] = useState(false)
  const [showCustomToField, setShowCustomToField] = useState(false) // For showing dropdown when Hyperliquid is selected
  const [fromSearchQuery, setFromSearchQuery] = useState('')
  const [toSearchQuery, setToSearchQuery] = useState('')
  const [fromChainFilter, setFromChainFilter] = useState<string | null>(null)
  const [toChainFilter, setToChainFilter] = useState<string | null>(null)

  // Pagination state - how many tokens to show
  const [fromTokensToShow, setFromTokensToShow] = useState(15)
  const [toTokensToShow, setToTokensToShow] = useState(15)

  // Get native balance
  const { data: nativeBalance } = useBalance({ address })

  // Get token balance when a token is selected (not ETH)
  // Compute token address based on current chain and token symbol
  const tokenAddress = useMemo(() => {
    if (fromToken.symbol === 'ETH') return undefined
    
    // Map chain ID to TOKEN_ADDRESSES key (e.g., 'bas' -> 'base', 'eth' -> 'ethereum')
    const getTokenAddressKey = (chainId: string): string => {
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
    
    const tokenAddressKey = getTokenAddressKey(fromChain.id)
    const chainTokens = TOKEN_ADDRESSES[tokenAddressKey]
    let address = chainTokens?.[fromToken.symbol]
    
    // If not found, try ethereum as fallback
    if (!address) {
      address = TOKEN_ADDRESSES['ethereum']?.[fromToken.symbol]
    }
    
    // Special handling for USDC on Ethereum mainnet - use standard USDC address
    if (fromToken.symbol === 'USDC' && tokenAddressKey === 'ethereum') {
      const standardUsdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      if (address !== standardUsdcAddress) {
        console.log('[Balance] Using standard USDC address for Ethereum', { originalAddress: address, standardUsdcAddress })
        address = standardUsdcAddress
      }
    }
    
    // For Hyperliquid USDT, use the same address as USDC for now (may need to be updated when USDT is fully enabled)
    if (((fromChain as any).id === 'hpl' || (fromChain as any).id === 'hyperliquid') && fromToken.symbol === 'USDT') {
      // USDT on Hyperliquid may use the same contract as USDC or may not be fully enabled yet
      address = chainTokens?.['USDC']
    }
    
    console.log('[Balance] Token address lookup:', {
      chain: fromChain.id,
      tokenAddressKey,
      token: fromToken.symbol,
      foundAddress: address,
      hasChainTokens: !!chainTokens,
      chainTokensKeys: chainTokens ? Object.keys(chainTokens).slice(0, 5) : []
    })
    
    return address as `0x${string}` | undefined
  }, [fromChain.id, fromToken.symbol])

  const { data: tokenBalance, isLoading: isLoadingTokenBalance } = useBalance({
    address,
    token: tokenAddress,
    query: {
      enabled: !!tokenAddress && isConnected && !!fromToken.symbol && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  })

  // Debug logging for balance query
  useEffect(() => {
    if (fromToken.symbol !== 'ETH' && tokenAddress) {
      console.log('[Balance Query]', {
        tokenAddress,
        tokenSymbol: fromToken.symbol,
        chain: fromChain.id,
        address,
        isConnected,
        tokenBalance: tokenBalance ? {
          value: tokenBalance.value?.toString(),
          formatted: tokenBalance.formatted,
          decimals: tokenBalance.decimals,
          symbol: tokenBalance.symbol
        } : null,
        isLoadingTokenBalance
      })
    }
  }, [tokenAddress, fromToken.symbol, fromChain.id, address, isConnected, tokenBalance, isLoadingTokenBalance])

  // Use token balance if available, otherwise native balance (only for ETH)
  // If token is not ETH and we don't have a valid token address or balance, show null/zero
  const balance = useMemo(() => {
    // For ETH, always use native balance
    if (fromToken.symbol === 'ETH') {
      return nativeBalance
    }
    
    // For non-ETH tokens, we need a token address to query balance
    if (!tokenAddress) {
      // No token address found - return null to show no balance
      return null
    }
    
    // If we have a token address but balance is still loading, return undefined to show loading
    if (isLoadingTokenBalance) {
      return undefined
    }
    
    // If we have token balance data, use it (even if it's 0)
    if (tokenBalance !== undefined && tokenBalance !== null) {
      return tokenBalance
    }
    
    // Token query completed but no balance returned - return null (user has 0 balance)
    return null
  }, [fromToken.symbol, tokenAddress, tokenBalance, nativeBalance, isLoadingTokenBalance])

  // Quote state
  const [quote, setQuote] = useState<any>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [routes, setRoutes] = useState<any>(null) // Store routes for messaging flow
  const [selectedRoute, setSelectedRoute] = useState<any>(null) // Selected route
  const [dismissedTxHashes, setDismissedTxHashes] = useState<Set<string>>(new Set())

  // Transaction state
  const { sendTransaction, data: txHash, isPending: isPendingTx, error: txError } = useSendTransaction()
  const { writeContract: writeApproval, data: approvalHash, isPending: isApproving } = useWriteContract()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  const { signTypedDataAsync, isPending: isSigningMessage } = useSignTypedData()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash && !dismissedTxHashes.has(txHash) ? txHash : undefined,
  })
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalHash,
  })

  // Approval state
  const [needsApproval, setNeedsApproval] = useState(false)
  const [chainMismatch, setChainMismatch] = useState(false)
  // Track the approval context (address and amount) to detect when a new approval is needed
  // Also track the approval hash to verify it matches the current transaction
  const [approvalContext, setApprovalContext] = useState<{
    approvalAddress: string | null
    tokenAddress: string | null
    amount: string | null
    approvalHash: string | null  // Track which approval hash is valid for this context
  } | null>(null)
  
  // Track previous quote to detect when a new quote is fetched
  const previousQuoteRef = useRef<any>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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

  // Track the transaction hash that we're showing success for
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null)


  // Track when txHash is set (transaction submitted)
  const prevTxHash = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (txHash && txHash !== prevTxHash.current) {
      console.log('[useEffect: txHash] Transaction hash received from wagmi:', {
        txHash,
        prevTxHash: prevTxHash.current,
        isPendingTx,
        isConfirming,
      })
      prevTxHash.current = txHash
    }
  }, [txHash, isPendingTx, isConfirming])

  // Log transaction state changes
  useEffect(() => {
    console.log('[useEffect: txState] Transaction state changed', {
      txHash,
      isPendingTx,
      isConfirming,
      isConfirmed,
      successTxHash,
      isDismissed: txHash ? dismissedTxHashes.has(txHash) : false,
      selectedRoute: !!selectedRoute,
      routeSteps: selectedRoute?.steps?.length,
    })
  }, [txHash, isPendingTx, isConfirming, isConfirmed, successTxHash, dismissedTxHashes, selectedRoute])

  // Reset all form state function
  const resetForm = useCallback(() => {
    console.log('[resetForm] Resetting all form state')
    setAmount('')
    setQuote(null)
    setRoutes(null)
    setSelectedRoute(null)
    setQuoteError(null)
    setNeedsApproval(false)
    setChainMismatch(false)
    setLoadingQuote(false)
    setApprovalContext(null) // Clear approval context so old approvals don't persist
    // Note: approvalHash and txHash are from wagmi hooks and will be cleared when new transactions start
    // We can't directly reset them, but they'll be replaced on next transaction
    // By clearing approvalContext, we ensure the UI treats any existing approvalHash as invalid
  }, [])

  // Reset form when bridge is complete (but keep success details for popup)
  useEffect(() => {
    console.log('[useEffect: success] Checking success conditions', {
      isConfirmed,
      txHash,
      successTxHash,
      isDismissed: dismissedTxHashes.has(txHash || ''),
      condition: isConfirmed && txHash && txHash !== successTxHash && !dismissedTxHashes.has(txHash),
    })

    if (isConfirmed && txHash && txHash !== successTxHash && !dismissedTxHashes.has(txHash)) {
      console.log('[useEffect: success] Conditions met, setting success state')
      // Store details for popup - don't reset form yet, wait for user to close popup
      setSuccessDetails({
        fromToken: fromToken.symbol,
        toChain: toChain.name,
      })
      setSuccessTxHash(txHash)
      
      // Mark this txHash as dismissed so it won't show again
      setDismissedTxHashes(prev => new Set(prev).add(txHash))
      
      // Don't reset form here - wait for user to close popup
    }
  }, [isConfirmed, txHash, fromToken.symbol, toChain.name, successTxHash, dismissedTxHashes])

  // Clear success state when starting a new transaction (form parameters change)
  useEffect(() => {
    // If we have success details but the txHash doesn't match, clear it
    if (successDetails && txHash !== successTxHash) {
      setSuccessDetails(null)
      setSuccessTxHash(null)
    }
  }, [fromChain, toChain, fromToken, toToken, amount, hyperliquidAddress, successDetails, txHash, successTxHash])

  // SIMPLE FIX: When quote changes, reset approval state
  // This ensures each new transaction requires a fresh approval
  useEffect(() => {
    // If quote changed (new quote fetched), reset approval state
    if (quote !== previousQuoteRef.current) {
      console.log('[SIMPLE FIX] Quote changed - resetting approval state', {
        hadPreviousQuote: !!previousQuoteRef.current,
        hasNewQuote: !!quote,
      })
      
      // Clear approval context - this makes any old approvalHash invalid
      setApprovalContext(null)
      
      // Set needsApproval based on new quote
      if (quote && fromToken) {
        const needsApprovalCheck = quote.estimate?.approvalAddress && fromToken.symbol !== 'ETH'
        setNeedsApproval(needsApprovalCheck)
        
        // Initialize new approval context if needed
        if (needsApprovalCheck) {
          setApprovalContext({
            approvalAddress: quote.estimate?.approvalAddress || null,
            tokenAddress: quote.action?.fromToken?.address || null,
            amount: quote.action?.fromAmount || null,
            approvalHash: null,  // No hash yet - must approve
          })
        }
      } else {
        setNeedsApproval(false)
      }
      
      previousQuoteRef.current = quote
    }
  }, [quote, fromToken])

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
    // Reset custom field checkbox when switching away from Hyperliquid
    if ((toChain as any).id !== 'hpl' && (toChain as any).id !== 'hyperliquid') {
      setShowCustomToField(false)
      setHyperliquidAddress('')
    }
  }, [toChain.id])

  // Sync address when useCurrentWallet is enabled
  useEffect(() => {
    if (useCurrentWallet && address) {
      setHyperliquidAddress(address)
    }
  }, [useCurrentWallet, address])

  // Auto-match destination token to source token when destination is Hyperliquid
  useEffect(() => {
    const isHyperliquid = (toChain as any).id === 'hpl' || (toChain as any).id === 'hyperliquid'

    if (isHyperliquid && fromToken.symbol) {
      const availableTokens = getTokensForChain(toChain.id)

      // Try to find the same token symbol on Hyperliquid
      const matchingToken = availableTokens.find(t =>
        t.symbol.toUpperCase() === fromToken.symbol.toUpperCase()
      )

      if (matchingToken) {
        // If the same token exists on Hyperliquid, use it
        setToToken(matchingToken)
      } else {
        // If ETH/WETH, default to USDC (Hyperliquid doesn't have ETH)
        if (fromToken.symbol === 'ETH' || fromToken.symbol === 'WETH') {
          const usdcToken = availableTokens.find(t => t.symbol === 'USDC')
          if (usdcToken) {
            setToToken(usdcToken)
          }
        } else {
          // For other tokens, try to find USDC as fallback
          const usdcToken = availableTokens.find(t => t.symbol === 'USDC')
          if (usdcToken) {
            setToToken(usdcToken)
          } else if (availableTokens.length > 0) {
            setToToken(availableTokens[0])
          }
        }
      }
    }
  }, [fromToken.symbol, toChain.id])

  // Fetch quote when parameters change
  useEffect(() => {
    if (!isConnected || !address || !amount || parseFloat(amount) <= 0) {
      setQuote(null)
      return
    }

    const fetchQuote = async () => {
      // Don't fetch quote if amount is empty or if success popup is showing
      if (!amount || parseFloat(amount) <= 0 || successDetails) {
        setLoadingQuote(false)
        return
      }
      
      setLoadingQuote(true)
      setQuoteError(null)
      setRoutes(null)
      setSelectedRoute(null)
      // HARDCODED: Clear approval state when fetching new quote
      // This ensures approval is always required for new transactions
      setApprovalContext(null)
      setNeedsApproval(false)

      try {
        // Validate and normalize the Hyperliquid address if provided
        let normalizedHyperliquidAddress: string | null = null
        if (hyperliquidAddress && hyperliquidAddress.trim()) {
          const trimmedAddress = hyperliquidAddress.trim()
          if (isAddress(trimmedAddress)) {
            // Normalize to checksummed address
            normalizedHyperliquidAddress = getAddress(trimmedAddress)
          } else {
            // Invalid address format - don't proceed with quote
            setQuoteError('Invalid Hyperliquid address format. Please enter a valid Ethereum address (0x...).')
            setLoadingQuote(false)
            return
          }
        }

        // For Hyperliquid, always use routes API (both direct mode and advanced mode)
        const isHyperliquid = (toChain.id === 'hpl' || toChain.id === 'hyperliquid')
        const isHyperliquidDirect = isHyperliquid && normalizedHyperliquidAddress && !showCustomToField
        const isHyperliquidAdvanced = isHyperliquid && showCustomToField
        let gotQuoteFromRoutes = false // Track if we got a quote from routes

        // For Hyperliquid transfers (both direct and advanced mode), use advanced routes API
        // Direct mode defaults to perps USDC on HyperCore
        if (isHyperliquidDirect || isHyperliquidAdvanced) {
          // Use the same routing as advanced mode
          // LiFi will handle the multi-step route automatically
          try {
            // For direct mode, always use perps USDC; for advanced mode, use selected token
            const targetToToken = isHyperliquidDirect 
              ? 'USDC (perps)'
              : toToken.symbol
            
            console.log('[Routes] Fetching routes with:', {
              isHyperliquidDirect,
              targetToToken,
              toTokenSymbol: toToken.symbol,
              fromChain: fromChain.id,
              toChain: toChain.id
            })
            
            // For advanced mode, use the connected wallet address; for direct mode, use the entered Hyperliquid address
            const targetToAddress = isHyperliquidDirect 
              ? normalizedHyperliquidAddress!
              : address
            
            const routesData = await getRoutes({
              fromChain: fromChain.id,
              toChain: toChain.id, // Route directly to Hyperliquid (same as advanced mode)
              fromToken: fromToken.symbol,
              toToken: targetToToken,
              fromAmount: amount,
              fromAddress: address,
              toAddress: targetToAddress,
              slippage: 0.03,
            })

            if (routesData && routesData.routes && routesData.routes.length > 0) {
              console.log('Found routes to Hyperliquid:', routesData.routes.length, 'routes')
              
              // Log the toToken address in the first step to verify routes API used correct address
              if (routesData.routes[0]?.steps?.[0]?.action?.toToken) {
                const stepToToken = routesData.routes[0].steps[0].action.toToken
                const expectedAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' // perps address
                console.log('[RoutesResponse] First step toToken from routes API:', {
                  expectedAddress,
                  actualAddress: stepToToken.address,
                  symbol: stepToToken.symbol,
                  matches: stepToToken.address?.toLowerCase() === expectedAddress.toLowerCase()
                })
              }
              
              setRoutes(routesData)

              // Find the best route - prefer routes that bridge directly to Hyperliquid
              // Look for routes with Hyperliquid steps (direct bridge to HyperCore)
              let bestRoute = routesData.routes.find((route: any) => {
                // Prefer routes with Hyperliquid steps (direct bridge to HyperCore)
                if (route.steps.some((step: any) =>
                  step.tool === 'hyperliquidSA' ||
                  step.toolDetails?.key === 'hyperliquidSA' ||
                  step.action?.toChainId === 1337 // Hyperliquid chain ID
                )) {
                  return true
                }
                // Also check if route ends on Hyperliquid
                const lastStep = route.steps[route.steps.length - 1]
                if (lastStep && (lastStep.action?.toChainId === 1337 || route.toChainId === 1337)) {
                  return true
                }
                return false
              })

              // If no specific route, find one that executes on fromChain
              if (!bestRoute) {
                bestRoute = routesData.routes.find((route: any) => {
                  const firstStep = route.steps[0]
                  return firstStep && firstStep.action.fromChainId === CHAIN_IDS[fromChain.id]
                })
              }

              // Fallback to first route
              if (!bestRoute) {
                bestRoute = routesData.routes[0]
              }

              if (bestRoute && bestRoute.steps && bestRoute.steps.length > 0) {
                setSelectedRoute(bestRoute)
                let firstStep = bestRoute.steps[0]

                // Check if this route ends on Hyperliquid
                const lastStep = bestRoute.steps[bestRoute.steps.length - 1]
                // Check route's final destination chain ID
                const routeToChainId = bestRoute.toChainId
                const endsOnHyperliquid = routeToChainId === 1337 // Hyperliquid chain ID
                const hasHyperliquidStep = bestRoute.steps.some((step: any) =>
                  step.action?.toChainId === 1337 ||
                  step.tool === 'hyperliquidSA' ||
                  step.toolDetails?.key === 'hyperliquidSA' ||
                  (step as any).toChainId === 1337
                )

                // Route should end on Hyperliquid when using direct mode
                // LiFi will handle the routing automatically

                // CRITICAL: Check if the step has the correct perps address
                // If not, we need to reject this route and try again, as modifying the step causes 422 errors
                if (isHyperliquidDirect && firstStep.action?.toToken) {
                  const expectedAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' // perps address
                  const actualAddress = firstStep.action.toToken.address
                  const addressMatches = actualAddress?.toLowerCase() === expectedAddress.toLowerCase()
                  
                  console.log('[StepCheck] Verifying step toToken address:', {
                    expectedAddress,
                    actualAddress,
                    addressMatches,
                    targetToToken
                  })
                  
                  // If the address is wrong, reject this route and throw an error
                  // This will cause the quote fetch to fail and the user can try again
                  if (!addressMatches) {
                    const errorMsg = `Routes API returned incorrect token address. Expected ${expectedAddress} for perps account, but got ${actualAddress}. Please try again.`
                    console.error('[StepCheck]', errorMsg)
                    setQuoteError(errorMsg)
                    setLoadingQuote(false)
                    return
                  }
                }

                // Get transaction data for the first step
                // NOTE: We cannot modify the step before calling getStepTransaction as it causes 422 errors
                // The routes API should return the correct address based on toTokenAddress we provided
                try {
                  const stepWithTx = await getStepTransaction(firstStep)

                  // Check if this is a messaging step (intent-based flow with Relay)
                  const isMessagingStep = stepWithTx.type === 'message' ||
                    stepWithTx.tool === 'hyperliquidSA' ||
                    stepWithTx.toolDetails?.key === 'hyperliquidSA' ||
                    stepWithTx.message

                  // Ensure the quote structure matches QuoteResponse format for approval handling
                  // The stepWithTx from getStepTransaction should have action and estimate at top level
                  // But we'll ensure they're there by checking stepWithTx first, then firstStep as fallback
                  const stepAction = stepWithTx.action || firstStep.action
                  const quoteEstimate = stepWithTx.estimate || firstStep.estimate
                  
                  // Ensure action.fromToken.address is set (needed for handleApproval)
                  // Look up token address if not present in step action
                  let fromTokenAddress = stepAction?.fromToken?.address
                  if (!fromTokenAddress && fromToken.symbol !== 'ETH') {
                    // Look up token address from TOKEN_ADDRESSES
                    const chainTokens = TOKEN_ADDRESSES[fromChain.id] || TOKEN_ADDRESSES['ethereum']
                    fromTokenAddress = chainTokens?.[fromToken.symbol]
                  }
                  
                  // CRITICAL: Determine the correct toToken address for Hyperliquid
                  let toTokenAddress = stepAction?.toToken?.address
                  const isHyperliquid = (toChain.id === 'hpl' || toChain.id === 'hyperliquid')
                  if (isHyperliquid && isHyperliquidDirect) {
                    // Always use perps address for Hyperliquid direct mode
                    toTokenAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
                    console.log('[StepAction] FORCING toToken address to PERPS:', {
                      toTokenAddress,
                      isHyperliquid,
                      isHyperliquidDirect,
                      originalAddress: stepAction?.toToken?.address,
                      originalSymbol: stepAction?.toToken?.symbol
                    })
                  } else if (!toTokenAddress) {
                    // For other tokens, look it up
                    const chainTokens = TOKEN_ADDRESSES[toChain.id] || TOKEN_ADDRESSES['ethereum']
                    toTokenAddress = chainTokens?.[toToken.symbol] || stepAction?.toToken?.address || ''
                    console.log('[StepAction] Using address from lookup:', toTokenAddress)
                  }
                  
                  // CRITICAL: Update stepWithTx.action.toToken.address directly so it's used in the actual transaction
                  // When in direct mode to Hyperliquid, keep the original symbol (USDC (perps)) to match the address
                  const finalSymbolForStep = (isHyperliquid && isHyperliquidDirect) 
                    ? stepAction?.toToken?.symbol || 'USDC (perps)'
                    : toToken.symbol
                  
                  if (stepWithTx.action) {
                    stepWithTx.action.toToken = {
                      ...stepWithTx.action.toToken,
                      address: toTokenAddress,
                      symbol: finalSymbolForStep,
                    }
                    console.log('[StepAction] Updated stepWithTx.action.toToken:', { 
                      address: toTokenAddress, 
                      symbol: finalSymbolForStep,
                      isHyperliquidDirect 
                    })
                  }
                  
                  // Also update firstStep.action if it exists (for fallback)
                  if (firstStep.action) {
                    firstStep.action.toToken = {
                      ...firstStep.action.toToken,
                      address: toTokenAddress,
                      symbol: finalSymbolForStep,
                    }
                  }
                  
                  // Build complete action object with all required fields
                  // When advanced bridge is off (!showCustomToField) and going to Hyperliquid, always use USDC for toToken
                  const isHyperliquidDest = (toChain.id === 'hpl' || toChain.id === 'hyperliquid')
                  const finalToTokenSymbol = (!showCustomToField && isHyperliquidDest) ? 'USDC' : toToken.symbol
                  const finalToTokenDecimals = (!showCustomToField && isHyperliquidDest) ? 6 : (stepAction?.toToken?.decimals || (toToken.symbol === 'ETH' ? 18 : 6))
                  
                  const quoteAction = {
                    ...stepAction,
                    fromToken: {
                      ...stepAction?.fromToken,
                      address: fromTokenAddress || stepAction?.fromToken?.address || (fromToken.symbol === 'ETH' ? '0x0000000000000000000000000000000000000000' : ''),
                      symbol: fromToken.symbol,
                      decimals: stepAction?.fromToken?.decimals || (fromToken.symbol === 'ETH' ? 18 : 6),
                    },
                    toToken: {
                      ...stepAction?.toToken,
                      address: toTokenAddress,
                      symbol: finalToTokenSymbol,
                      decimals: finalToTokenDecimals,
                    },
                  }
                  
                  // Check for approval address in multiple possible locations
                  // Priority: stepWithTx.estimate (from getStepTransaction) > firstStep.estimate (from routes)
                  // Also check includedSteps for approval transactions
                  let approvalAddress = stepWithTx.estimate?.approvalAddress || 
                                         firstStep.estimate?.approvalAddress ||
                                         quoteEstimate?.approvalAddress
                  
                  // If not found in estimate, check includedSteps for approval step
                  if (!approvalAddress && (firstStep as any).includedSteps) {
                    for (const includedStep of (firstStep as any).includedSteps) {
                      if (includedStep.estimate?.approvalAddress) {
                        approvalAddress = includedStep.estimate.approvalAddress
                        break
                      }
                    }
                  }
                  
                  // Also check stepWithTx.includedSteps
                  if (!approvalAddress && (stepWithTx as any).includedSteps) {
                    for (const includedStep of (stepWithTx as any).includedSteps) {
                      if (includedStep.estimate?.approvalAddress) {
                        approvalAddress = includedStep.estimate.approvalAddress
                        break
                      }
                    }
                  }
                  
                  // Debug logging to help diagnose approval issues
                  console.log('[Routes] Approval check:', {
                    hasStepWithTxEstimate: !!stepWithTx.estimate,
                    stepWithTxApprovalAddress: stepWithTx.estimate?.approvalAddress,
                    hasFirstStepEstimate: !!firstStep.estimate,
                    firstStepApprovalAddress: firstStep.estimate?.approvalAddress,
                    quoteEstimateApprovalAddress: quoteEstimate?.approvalAddress,
                    finalApprovalAddress: approvalAddress,
                    fromToken: fromToken.symbol,
                    fromTokenAddress: fromTokenAddress,
                    hasActionFromTokenAddress: !!quoteAction.fromToken.address,
                    willNeedApproval: approvalAddress && fromToken.symbol !== 'ETH',
                  })
                  
                  if (isMessagingStep) {
                    // For messaging steps (intent-based), use the step data directly
                    const quoteData = {
                      ...stepWithTx,
                      // Ensure action and estimate are at the top level (same as getQuote response)
                      action: quoteAction,
                      estimate: {
                        ...quoteEstimate,
                        // Explicitly set approvalAddress - ensure it's always in the quote
                        approvalAddress: approvalAddress,
                      },
                      isMessaging: true,
                      route: bestRoute,
                      step: firstStep,
                      stepIndex: 0,
                      totalSteps: bestRoute.steps.length,
                    }
                    setQuote(quoteData)
                    // Set approval state immediately - check approvalAddress we found
                    // Also verify it's actually in the quote object we just set
                    const hasApproval = approvalAddress && fromToken.symbol !== 'ETH' && quoteData.estimate?.approvalAddress
                    console.log('[Routes] Setting approval state:', {
                      approvalAddress,
                      fromToken: fromToken.symbol,
                      hasApproval,
                      quoteEstimateApprovalAddress: quoteData.estimate?.approvalAddress,
                    })
                    setNeedsApproval(!!hasApproval)
                    gotQuoteFromRoutes = true
                  } else if (stepWithTx.transactionRequest) {
                    // For regular transaction steps (one-step bridge), use transactionRequest
                    const quoteData = {
                      ...stepWithTx,
                      // Ensure action and estimate are at the top level (same as getQuote response)
                      action: quoteAction,
                      estimate: {
                        ...quoteEstimate,
                        // Explicitly set approvalAddress - ensure it's always in the quote
                        approvalAddress: approvalAddress,
                      },
                      isMessaging: false,
                      route: bestRoute,
                      step: firstStep,
                      stepIndex: 0,
                      totalSteps: bestRoute.steps.length,
                    }
                    setQuote(quoteData)
                    // Set approval state immediately - check approvalAddress we found
                    // Also verify it's actually in the quote object we just set
                    const hasApproval = approvalAddress && fromToken.symbol !== 'ETH' && quoteData.estimate?.approvalAddress
                    console.log('[Routes] Setting approval state:', {
                      approvalAddress,
                      fromToken: fromToken.symbol,
                      hasApproval,
                      quoteEstimateApprovalAddress: quoteData.estimate?.approvalAddress,
                    })
                    setNeedsApproval(!!hasApproval)
                    gotQuoteFromRoutes = true
                  } else {
                    // Fallback to simple quote
                    throw new Error('No transaction data in step')
                  }
                } catch (stepError: any) {
                  console.error('Error getting step transaction:', stepError)
                  // Fallback to simple quote
                  throw stepError
                }
              } else {
                // No valid route found
                console.log('No valid route found in routes')
              }
            } else {
              // No routes available
              console.log('No routes available in response:', routesData)

              // Check if there's information about why routes are unavailable
              const unavailableRoutes = (routesData as any)?.unavailableRoutes
              if (unavailableRoutes) {
                console.log('Unavailable routes info:', unavailableRoutes)
              }

              // For Hyperliquid, don't fall back to simple quote API (it doesn't support Hyperliquid)
              if (isHyperliquidDirect) {
                const errorMsg = unavailableRoutes
                  ? `No routes available: ${JSON.stringify(unavailableRoutes)}`
                  : 'No routes available for this transfer. The selected token pair may not be supported for Hyperliquid transfers. Please try a different token or check if the route is available.'
                setQuoteError(errorMsg)
                setLoadingQuote(false)
                return
              }

              console.log('Falling back to simple quote API')
            }
          } catch (routesError: any) {
            console.error('Routes error for Hyperliquid one-step transfer:', routesError)

            // For Hyperliquid, don't fall back to simple quote API (it doesn't support Hyperliquid)
            if (isHyperliquidDirect) {
              const errorMsg = routesError?.message || 'Unable to find routes for Hyperliquid transfer. Please try a different token pair or check if the route is supported.'
              setQuoteError(errorMsg)
              setLoadingQuote(false)
              return
            }

            // If routes API fails, try falling back to simple quote API (only for non-Hyperliquid)
            console.log('Routes API failed, falling back to simple quote API')
            gotQuoteFromRoutes = false
          }
        }

        // Fall back to simple quote if routes didn't work or not using Hyperliquid direct
        // For Hyperliquid, require address to be entered (don't default to current wallet)
        // UNLESS using advanced bridge mode (showCustomToField)
        if (!gotQuoteFromRoutes) {
          // If Hyperliquid is selected but no address entered AND not using advanced bridge, don't fetch quote
          const isHyperliquidSelected = (toChain.id === 'hpl' || toChain.id === 'hyperliquid')
          if (isHyperliquidSelected && !showCustomToField && !normalizedHyperliquidAddress) {
            setQuoteError('Please enter a Hyperliquid core account address')
            setLoadingQuote(false)
            return
          }

          // Don't try simple quote API for Hyperliquid - it doesn't support it
          if (isHyperliquidSelected) {
            setQuoteError('No routes available for Hyperliquid transfer. Please try using the advanced routes API or select a different destination chain.')
            setLoadingQuote(false)
            return
          }

          try {
            const quoteData = await getQuote({
              fromChain: fromChain.id,
              toChain: toChain.id,
              fromToken: fromToken.symbol,
              toToken: toToken.symbol,
              fromAmount: amount,
              fromAddress: address,
              toAddress: isHyperliquidDirect ? normalizedHyperliquidAddress! : (showCustomToField ? address : address),
              slippage: 0.03, // 3% slippage
            })

            if (quoteData) {
              // CRITICAL: Reject quote if it's not on the fromChain
              const requiredChainId = quoteData.transactionRequest?.chainId || quoteData.action?.fromChainId
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
                setLoadingQuote(false)
                return
              }

              // When advanced bridge is off and going to Hyperliquid, force toToken to USDC
              const isHyperliquidSelected = (toChain.id === 'hpl' || toChain.id === 'hyperliquid')
              if (!showCustomToField && isHyperliquidSelected && quoteData.action?.toToken) {
                quoteData.action.toToken = {
                  ...quoteData.action.toToken,
                  symbol: 'USDC',
                  decimals: 6,
                }
              }

              setQuote(quoteData)
              setQuoteError(null)

              // Check if approval is needed
              if (quoteData.estimate?.approvalAddress && fromToken.symbol !== 'ETH') {
                setNeedsApproval(true)
              } else {
                setNeedsApproval(false)
              }
            } else {
              // More specific error message
              const errorMsg = 'Unable to fetch quote. Please check that both tokens are available on the selected chains.'
              setQuoteError(errorMsg)
              setNeedsApproval(false)
            }
          } catch (quoteError: any) {
            console.error('Quote error:', quoteError)
            setQuoteError(quoteError?.message || 'Unable to fetch quote. Please try again.')
            setNeedsApproval(false)
          }
        } else {
          // Quote was set from routes - re-check if approval is needed
          // This is a fallback in case the state didn't update correctly
          if (quote) {
            const needsApprovalCheck = quote.estimate?.approvalAddress && fromToken.symbol !== 'ETH'
            console.log('[Routes Fallback] Re-checking approval:', {
              hasQuote: !!quote,
              hasEstimate: !!quote.estimate,
              approvalAddress: quote.estimate?.approvalAddress,
              fromToken: fromToken.symbol,
              needsApproval: needsApprovalCheck,
            })
            setNeedsApproval(needsApprovalCheck)
          } else {
            setNeedsApproval(false)
          }
        }
      } catch (error: any) {
        console.error('Error fetching quote:', error)
        const errorMessage = error?.message || error?.toString() || 'Error fetching quote. Please try again.'
        setQuoteError(errorMessage)
      } finally {
        setLoadingQuote(false)
      }
    }

    // Debounce quote fetching
    const timeoutId = setTimeout(fetchQuote, 500)
    return () => clearTimeout(timeoutId)
  }, [isConnected, address, fromChain, toChain, fromToken, toToken, amount, hyperliquidAddress, showCustomToField, successDetails])

  // Re-check approval whenever quote changes (ensures approval state is always in sync)
  // Note: Transaction key effect already cleared context if it's a new transaction
  useEffect(() => {
    if (quote && fromToken) {
      const needsApprovalCheck = quote.estimate?.approvalAddress && fromToken.symbol !== 'ETH'
      const currentApprovalAddress = quote.estimate?.approvalAddress
      const currentTokenAddress = quote.action?.fromToken?.address
      const currentAmount = quote.action?.fromAmount
      
      // If approval is needed but we don't have context yet, initialize it
      // (Transaction key effect already cleared old context if this is a new transaction)
      if (needsApprovalCheck && !approvalContext) {
        console.log('[Quote Effect] Initializing approval context for new quote', {
          approvalAddress: currentApprovalAddress,
          tokenAddress: currentTokenAddress,
          amount: currentAmount,
        })
        setApprovalContext({
          approvalAddress: currentApprovalAddress || null,
          tokenAddress: currentTokenAddress || null,
          amount: currentAmount || null,
          approvalHash: null,  // No hash yet - will be set when approval is submitted
        })
      } else if (approvalContext && needsApprovalCheck) {
        // If we have context, verify it still matches the quote
        // If it doesn't match, clear it (this handles edge cases)
        const contextMatches = 
          approvalContext.approvalAddress === currentApprovalAddress &&
          approvalContext.tokenAddress === currentTokenAddress &&
          approvalContext.amount === currentAmount
        
        if (!contextMatches) {
          console.log('[Quote Effect] Approval context mismatch, clearing', {
            oldContext: approvalContext,
            newContext: {
              approvalAddress: currentApprovalAddress,
              tokenAddress: currentTokenAddress,
              amount: currentAmount,
            }
          })
          setApprovalContext({
            approvalAddress: currentApprovalAddress || null,
            tokenAddress: currentTokenAddress || null,
            amount: currentAmount || null,
            approvalHash: null,  // Clear hash since context changed
          })
        }
      }
      
      // HARDCODED: Always update needsApproval state based on quote requirement
      // This ensures approval is always required when quote needs it
      if (needsApproval !== needsApprovalCheck) {
        console.log('[Quote Effect] HARDCODED: Setting needsApproval', {
          needsApprovalCheck,
          currentNeedsApproval: needsApproval,
        })
        setNeedsApproval(needsApprovalCheck)
      }
    } else if (!quote) {
      // No quote means no transaction, so no approval needed
      setNeedsApproval(false)
      // Don't clear context here - transaction key effect handles it
    }
  }, [quote, fromToken, approvalContext, needsApproval])

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

      // Update approval context when starting a new approval (hash will be set when transaction is submitted)
      setApprovalContext({
        approvalAddress,
        tokenAddress,
        amount: quote.action.fromAmount,
        approvalHash: null,  // Will be updated when approvalHash is set
      })

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

  // Update approval context with hash when approval transaction is submitted
  // Only update if context matches current quote (safety check)
  useEffect(() => {
    if (approvalHash && approvalContext && !approvalContext.approvalHash) {
      // Verify context matches current quote before associating hash
      const contextMatches = quote &&
        approvalContext.approvalAddress === quote.estimate?.approvalAddress &&
        approvalContext.tokenAddress === quote.action?.fromToken?.address &&
        approvalContext.amount === quote.action?.fromAmount
      
      if (contextMatches) {
        console.log('[useEffect: approvalHash] Updating approval context with hash', { approvalHash })
        setApprovalContext({
          ...approvalContext,
          approvalHash,
        })
      } else {
        console.log('[useEffect: approvalHash] Hash received but context doesn\'t match quote - ignoring', {
          approvalHash,
          context: approvalContext,
          quoteApprovalAddress: quote?.estimate?.approvalAddress,
        })
      }
    }
  }, [approvalHash, approvalContext, quote])

  const handleBridge = async () => {
    console.log('[handleBridge] Called', {
      hasQuote: !!quote,
      hasAddress: !!address,
      isConnected,
      needsApproval,
      isApprovalConfirmed,
      quoteType: quote?.type,
      isMessaging: quote?.isMessaging,
      hasMessage: !!quote?.message,
      totalSteps: quote?.totalSteps,
      txHash,
      isConfirmed,
      isPendingTx,
      isConfirming,
      successDetails: !!successDetails,
    })

    // Don't proceed if success popup is showing
    if (successDetails) {
      console.log('[handleBridge] Early return: success popup is showing')
      return
    }

    if (!quote || !address || !isConnected) {
      console.log('[handleBridge] Early return: missing quote, address, or not connected')
      return
    }

    // If approval is needed, check if it's confirmed AND matches current quote context AND hash
    // This is a strict check - ALL conditions must be true
    const hasValidApproval = approvalContext &&
      approvalContext.approvalAddress === quote.estimate?.approvalAddress &&
      approvalContext.tokenAddress === quote.action?.fromToken?.address &&
      approvalContext.amount === quote.action?.fromAmount &&
      approvalContext.approvalHash === approvalHash &&  // Hash must match
      isApprovalConfirmed  // Must be confirmed
    
    if (needsApproval && quote.estimate?.approvalAddress && !hasValidApproval) {
      console.log('[handleBridge] Early return: approval needed but not valid', {
        needsApproval,
        isApprovalConfirmed,
        hasValidApproval,
        approvalContext,
        approvalHash,
        contextHash: approvalContext?.approvalHash,
        currentApprovalAddress: quote.estimate?.approvalAddress,
        currentTokenAddress: quote.action?.fromToken?.address,
        currentAmount: quote.action?.fromAmount,
        hashMatches: approvalContext?.approvalHash === approvalHash,
      })
      setQuoteError('Please approve the token first')
      return
    }

    try {
      // Check if this is a messaging step (for Hyperliquid direct transfers)
      const isMessaging = quote.isMessaging || quote.type === 'message' || quote.message

      console.log('[handleBridge] Processing bridge', {
        isMessaging,
        hasMessage: !!quote.message,
        hasTransactionRequest: !!quote.transactionRequest,
        isMultiStep: !!(quote.route && quote.route.steps && quote.route.steps.length > 1),
      })

      if (isMessaging && quote.message) {
        // Handle messaging flow - sign EIP-712 message
        try {
          const message = quote.message

          // Sign the typed data
          console.log('[handleBridge] Signing typed data for messaging step')
          const signature = await signTypedDataAsync({
            domain: message.domain,
            types: message.types,
            primaryType: message.primaryType,
            message: message.message,
          })

          console.log('[handleBridge] Message signed:', signature)

          // Relay the signed message
          console.log('[handleBridge] Relaying message...')
          const relayResult = await relayMessage(quote.step, signature)

          console.log('[handleBridge] Message relayed:', relayResult)

          // For messaging, we don't get a txHash immediately
          // The relay endpoint returns a status that we can track
          if (relayResult.status || relayResult.txHash) {
            console.log('[handleBridge] Messaging step completed successfully, setting success state')
            // Set a pseudo txHash for tracking (or use the relay result)
            // Note: For messaging, we might need to track differently
            setQuoteError(null)
            // Show success message
            setSuccessDetails({
              fromToken: fromToken.symbol,
              toChain: toChain.name,
            })
            setSuccessTxHash(relayResult.txHash || 'messaging-' + Date.now())
            // Note: We might need to poll for status instead of using txHash
          } else {
            console.warn('[handleBridge] Messaging step completed but no status or txHash in result:', relayResult)
          }
        } catch (messageError: any) {
          console.error('[handleBridge] Error signing/relaying message:', messageError)
          setQuoteError(messageError?.message || 'Failed to sign or relay message')
          return
        }
      } else {
        // Handle regular transaction flow (bridge transaction - first step)
        const txRequest = quote.transactionRequest
        if (!txRequest) {
          setQuoteError('No transaction data available')
          return
        }

        // Check if this is a multi-step route (for Hyperliquid direct transfers)
        const isMultiStep = quote.route && quote.route.steps && quote.route.steps.length > 1

        console.log('[handleBridge] Regular transaction flow', {
          isMultiStep,
          totalSteps: isMultiStep ? quote.route.steps.length : 1,
        })


        // Check if user is on the correct chain
        // The transaction should be on the fromChain, not any intermediate chain
        const expectedChainId = CHAIN_IDS[fromChain.id]
        const requiredChainId = txRequest.chainId || quote.action?.fromChainId
        const currentChainId = chain?.id

        console.log('Chain check:', {
          fromChain: fromChain.name,
          expectedChainId,
          requiredChainId,
          currentChainId,
          txRequestChainId: txRequest.chainId,
          isMultiStep,
          totalSteps: quote.totalSteps
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
          if (isMultiStep) {
          }
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
              try {
                const result = switchChain({ chainId: requiredChainId as number }) as any
                if (result && typeof result === 'object' && typeof result.then === 'function') {
                  await result
                }
              } catch (err) {
                // Ignore - chain switch might not return a promise
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
              if (isMultiStep) {
              }
              return
            }
          }
          if (isMultiStep) {
          }
          return
        }

        setChainMismatch(false)

        // Execute the transaction using sendTransaction
        console.log('[handleBridge] Sending transaction', {
          to: txRequest.to,
          value: txRequest.value,
          hasData: !!txRequest.data,
          gasLimit: txRequest.gasLimit,
          chainId: txRequest.chainId,
          isMultiStep,
        })
        // Use EIP-1559 format (maxFeePerGas) instead of gasPrice
        sendTransaction({
          to: txRequest.to as `0x${string}`,
          value: BigInt(txRequest.value || '0'),
          data: txRequest.data as `0x${string}`,
          gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
          // Don't set gasPrice - let wagmi handle it with EIP-1559
        })
        console.log('[handleBridge] Transaction sent, waiting for confirmation...', {
          currentTxHash: txHash,
          isPendingTx,
          isConfirming,
        })
      }
    } catch (error: any) {
      console.error('[handleBridge] Error executing bridge:', error)
      setQuoteError(error?.message || 'Failed to execute bridge transaction')
    }
  }

  // Format output amount from quote
  const getOutputAmount = () => {
    if (quote?.estimate?.toAmount) {
      // When advanced bridge is off and going to Hyperliquid, always use USDC decimals (6)
      // When advanced bridge is on, use the actual toToken decimals from quote
      let decimals: number
      const isHyperliquidDest = (toChain.id === 'hpl' || toChain.id === 'hyperliquid')
      if (!showCustomToField && isHyperliquidDest) {
        // Advanced bridge is off and going to Hyperliquid - always USDC (6 decimals)
        decimals = 6
      } else {
        // Advanced bridge is on - use toToken decimals from quote, fallback to toToken state
        decimals = quote.action?.toToken?.decimals || (toToken.symbol === 'ETH' ? 18 : 6)
      }
      const formatted = formatUnits(BigInt(quote.estimate.toAmount), decimals)
      return formatted
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
            <div className="flex items-center gap-6">
              <a href="https://phorus.xyz" className="hover:opacity-80 transition-opacity">
                <h1 className="text-3xl font-serif font-light italic text-white">Phorus</h1>
              </a>
              <Link href="/leaderboard" className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Leaderboard
              </Link>
            </div>
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
                    Balance: {parseFloat(balance.formatted).toFixed(4)} {fromToken.symbol}
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
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${fromChainFilter === null
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
                          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${fromChainFilter === chain.id
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
                    <div
                      className="p-2 max-h-64 overflow-y-auto"
                      onScroll={(e) => {
                        const target = e.currentTarget
                        const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
                        // Load more when within 50px of bottom
                        if (scrollBottom < 50) {
                          setFromTokensToShow(prev => prev + 15)
                        }
                      }}
                    >
                      {(() => {
                        // Filter tokens based on search and chain filter
                        const filteredChains = fromChainFilter
                          ? chains.filter(c => c.id === fromChainFilter)
                          : chains

                        const searchQueryLower = fromSearchQuery?.toLowerCase() || ''
                        const isPopularTokenSearch = fromSearchQuery && POPULAR_TOKENS.includes(fromSearchQuery.toUpperCase())
                        const allTokens = filteredChains.flatMap(chain =>
                          getTokensForChain(chain.id)
                            .filter(token => {
                              if (!fromSearchQuery) return true

                              // If searching for a popular token, filter out vault/pool tokens unless symbol exactly matches
                              if (isPopularTokenSearch) {
                                const tokenSymbolUpper = token.symbol.toUpperCase()
                                const searchUpper = fromSearchQuery.toUpperCase()

                                // If symbol exactly matches, include it (but we'll prioritize standard names)
                                if (tokenSymbolUpper === searchUpper) {
                                  return true
                                }

                                // Otherwise, only include if symbol contains the query (not just name)
                                return token.symbol.toLowerCase().includes(searchQueryLower)
                              }

                              // Normal search: match symbol, name, or chain
                              return token.symbol.toLowerCase().includes(searchQueryLower) ||
                                token.name.toLowerCase().includes(searchQueryLower) ||
                                chain.name.toLowerCase().includes(searchQueryLower)
                            })
                            .map(token => {
                              const nameLower = token.name.toLowerCase()
                              const isVaultToken = nameLower.includes('vault') ||
                                nameLower.includes('pool') ||
                                nameLower.includes('yield') ||
                                nameLower.includes('strategy')

                              return {
                                ...token,
                                chain,
                                isVaultToken,
                                // Add match score for sorting: exact symbol match = highest priority
                                matchScore: fromSearchQuery ? (
                                  token.symbol.toLowerCase() === searchQueryLower ? (
                                    isVaultToken ? 2.5 : 3 // Exact symbol match, but vault tokens get lower score
                                  ) : token.symbol.toLowerCase().startsWith(searchQueryLower) ? 2 : // Symbol starts with query
                                    token.symbol.toLowerCase().includes(searchQueryLower) ? 1 : // Symbol contains query
                                      0 // Only name/chain match
                                ) : 0
                              }
                            })
                        )

                        // Only remove duplicates when NOT searching - when searching, show all instances across chains
                        // When deduplicating, keep the token from the most popular chain
                        let uniqueTokens = fromSearchQuery
                          ? allTokens // Show all instances when searching
                          : (() => {
                            const tokenMap = new Map<string, typeof allTokens[0]>()
                            for (const token of allTokens) {
                              const existing = tokenMap.get(token.symbol)
                              if (!existing) {
                                tokenMap.set(token.symbol, token)
                              } else {
                                // If we already have this token, keep the one from the more popular chain
                                const existingChainIndex = POPULAR_CHAINS.indexOf(existing.chain.id)
                                const newChainIndex = POPULAR_CHAINS.indexOf(token.chain.id)
                                if (newChainIndex !== -1 && (existingChainIndex === -1 || newChainIndex < existingChainIndex)) {
                                  tokenMap.set(token.symbol, token)
                                }
                              }
                            }
                            return Array.from(tokenMap.values())
                          })()

                        // Sort tokens: match score first, then popular tokens, then popular chains, then alphabetically
                        uniqueTokens = uniqueTokens.sort((a, b) => {
                          // First: prioritize by match score (exact symbol matches first)
                          if (a.matchScore !== b.matchScore) {
                            return b.matchScore - a.matchScore
                          }

                          const aTokenIndex = POPULAR_TOKENS.indexOf(a.symbol)
                          const bTokenIndex = POPULAR_TOKENS.indexOf(b.symbol)
                          const aChainIndex = POPULAR_CHAINS.indexOf(a.chain.id)
                          const bChainIndex = POPULAR_CHAINS.indexOf(b.chain.id)

                          // Both are popular tokens - maintain order
                          if (aTokenIndex !== -1 && bTokenIndex !== -1) {
                            if (aTokenIndex !== bTokenIndex) {
                              return aTokenIndex - bTokenIndex
                            }
                            // Same token, prioritize popular chains
                            if (aChainIndex !== -1 && bChainIndex !== -1) {
                              return aChainIndex - bChainIndex
                            }
                            if (aChainIndex !== -1) return -1
                            if (bChainIndex !== -1) return 1
                            return a.chain.name.localeCompare(b.chain.name)
                          }

                          // Only a is popular
                          if (aTokenIndex !== -1) return -1
                          // Only b is popular
                          if (bTokenIndex !== -1) return 1

                          // Neither is popular - prioritize popular chains
                          if (aChainIndex !== -1 && bChainIndex !== -1) {
                            return aChainIndex - bChainIndex
                          }
                          if (aChainIndex !== -1) return -1
                          if (bChainIndex !== -1) return 1

                          // Sort by token symbol, then chain name
                          const symbolCompare = a.symbol.localeCompare(b.symbol)
                          if (symbolCompare !== 0) return symbolCompare
                          return a.chain.name.localeCompare(b.chain.name)
                        })

                        if (uniqueTokens.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500 text-sm">
                              No tokens found
                            </div>
                          )
                        }

                        // Paginate: only show first N tokens
                        const tokensToDisplay = uniqueTokens.slice(0, fromTokensToShow)
                        const hasMore = uniqueTokens.length > fromTokensToShow

                        return (
                          <>
                            {tokensToDisplay.map(({ symbol, name, chain: tokenChain }) => (
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
                                        try {
                                          const result = switchChain({ chainId }) as any
                                          if (result && typeof result === 'object' && typeof result.catch === 'function') {
                                            result.catch(() => { })
                                          }
                                        } catch (err) {
                                          // Ignore - chain switch might not return a promise
                                        }
                                      } catch (error) {
                                        // Silently handle switch chain errors
                                        console.error('Error switching chain:', error)
                                      }
                                    }
                                  }
                                }}
                                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-mint/10 rounded-lg transition-colors ${fromToken.symbol === symbol && fromChain.id === tokenChain.id ? 'bg-mint/10' : ''
                                  }`}
                              >
                                <TokenIcon symbol={symbol} size={24} chainId={tokenChain.id} />
                                <div className="flex-1 text-left">
                                  <div className="text-white font-medium">{symbol}</div>
                                  <div className="text-xs text-gray-400">{name} • {tokenChain.name}</div>
                                </div>
                              </button>
                            ))}
                            {hasMore && (
                              <div className="text-center py-2 text-xs text-gray-500">
                                Scroll for more tokens...
                              </div>
                            )}
                          </>
                        )
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

            {/* Swap Arrow or Direct Text */}
            <div className="flex justify-center -my-2">
              {showCustomToField ? (
                // Advanced bridge mode - show swap button
                <button
                  onClick={handleSwapChains}
                  className="bg-black border-2 border-mint/30 rounded-full p-3 hover:border-mint/50 transition-all hover:scale-110"
                >
                  <svg className="w-6 h-6 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              ) : (
                // Direct mode - show text with arrow below
                <div className="flex flex-col items-center gap-3 py-3">
                  <span className="text-base text-mint font-medium tracking-wide">Directly to your Hyperliquid trading account</span>
                  <div className="relative">
                    <div className="absolute inset-0 bg-mint/20 blur-xl rounded-full"></div>
                    <svg className="w-12 h-12 text-mint relative" fill="none" stroke="currentColor" viewBox="0 0 48 48" strokeWidth="2">
                      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M24 16 L24 32 M18 26 L24 32 L30 26" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* To Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {showCustomToField && (
                  <label className="text-sm text-gray-400 font-medium">To</label>
                )}
              </div>

              {/* Hyperliquid Core Account Address Input - Default when Hyperliquid is selected */}
              {((toChain as any).id === 'hpl' || (toChain as any).id === 'hyperliquid') ? (
                <>
                  {/* Address input - only show when advanced bridge is NOT checked */}
                  {!showCustomToField && (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={useCurrentWallet && address ? address : hyperliquidAddress}
                          onChange={(e) => {
                            if (!useCurrentWallet) {
                              const inputValue = e.target.value.trim()
                              setHyperliquidAddress(inputValue)
                              // Clear quote when address changes
                              if (inputValue !== hyperliquidAddress) {
                                setQuote(null)
                                setQuoteError(null)
                              }
                            }
                          }}
                          disabled={useCurrentWallet}
                          placeholder="Enter Hyperliquid core account address (0x...)"
                          className="bridge-input w-full px-4 py-3 pr-12 rounded-xl text-sm placeholder-gray-600 focus:border-mint/40 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        {isConnected && (
                          <button
                            type="button"
                            onClick={() => {
                              const newUseCurrentWallet = !useCurrentWallet
                              setUseCurrentWallet(newUseCurrentWallet)
                              if (newUseCurrentWallet && address) {
                                setHyperliquidAddress(address)
                                setQuote(null)
                                setQuoteError(null)
                              }
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-mint hover:text-mint/80 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={useCurrentWallet}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded border border-mint/40 bg-transparent text-mint focus:ring-mint/30 focus:ring-1 checked:bg-mint/10 checked:border-mint/60 appearance-none cursor-pointer transition-colors"
                              style={{
                                backgroundImage: useCurrentWallet ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23a8f5d0' d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z'/%3E%3C/svg%3E")` : 'none',
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                              }}
                            />
                            <span>Use connected wallet</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Unified Chain/Token Selector - Only show when checkbox is checked */}
                  {showCustomToField && (
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
                              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${toChainFilter === null
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
                                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${toChainFilter === chain.id
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
                          <div
                            className="p-2 max-h-64 overflow-y-auto"
                            onScroll={(e) => {
                              const target = e.currentTarget
                              const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
                              // Load more when within 50px of bottom
                              if (scrollBottom < 50) {
                                setToTokensToShow(prev => prev + 15)
                              }
                            }}
                          >
                            {(() => {
                              // Filter tokens based on search and chain filter
                              const filteredChains = toChainFilter
                                ? chains.filter(c => c.id === toChainFilter)
                                : chains

                              const searchQueryLower = toSearchQuery?.toLowerCase() || ''
                              const isPopularTokenSearch = toSearchQuery && POPULAR_TOKENS.includes(toSearchQuery.toUpperCase())
                              const allTokens = filteredChains.flatMap(chain =>
                                getTokensForChain(chain.id)
                                  .filter(token => {
                                    if (!toSearchQuery) return true

                                    // If searching for a popular token, filter out vault/pool tokens unless symbol exactly matches
                                    if (isPopularTokenSearch) {
                                      const tokenSymbolUpper = token.symbol.toUpperCase()
                                      const searchUpper = toSearchQuery.toUpperCase()

                                      // If symbol exactly matches, include it (but we'll prioritize standard names)
                                      if (tokenSymbolUpper === searchUpper) {
                                        return true
                                      }

                                      // Otherwise, only include if symbol contains the query (not just name)
                                      return token.symbol.toLowerCase().includes(searchQueryLower)
                                    }

                                    // Normal search: match symbol, name, or chain
                                    return token.symbol.toLowerCase().includes(searchQueryLower) ||
                                      token.name.toLowerCase().includes(searchQueryLower) ||
                                      chain.name.toLowerCase().includes(searchQueryLower)
                                  })
                                  .map(token => {
                                    const nameLower = token.name.toLowerCase()
                                    const isVaultToken = nameLower.includes('vault') ||
                                      nameLower.includes('pool') ||
                                      nameLower.includes('yield') ||
                                      nameLower.includes('strategy')

                                    return {
                                      ...token,
                                      chain,
                                      isVaultToken,
                                      // Add match score for sorting: exact symbol match = highest priority
                                      matchScore: toSearchQuery ? (
                                        token.symbol.toLowerCase() === searchQueryLower ? (
                                          isVaultToken ? 2.5 : 3 // Exact symbol match, but vault tokens get lower score
                                        ) : token.symbol.toLowerCase().startsWith(searchQueryLower) ? 2 : // Symbol starts with query
                                          token.symbol.toLowerCase().includes(searchQueryLower) ? 1 : // Symbol contains query
                                            0 // Only name/chain match
                                      ) : 0
                                    }
                                  })
                              )

                              // Only remove duplicates when NOT searching - when searching, show all instances across chains
                              // When deduplicating, keep the token from the most popular chain
                              let uniqueTokens = toSearchQuery
                                ? allTokens // Show all instances when searching
                                : (() => {
                                  const tokenMap = new Map<string, typeof allTokens[0]>()
                                  for (const token of allTokens) {
                                    const existing = tokenMap.get(token.symbol)
                                    if (!existing) {
                                      tokenMap.set(token.symbol, token)
                                    } else {
                                      // If we already have this token, keep the one from the more popular chain
                                      const existingChainIndex = POPULAR_CHAINS.indexOf(existing.chain.id)
                                      const newChainIndex = POPULAR_CHAINS.indexOf(token.chain.id)
                                      if (newChainIndex !== -1 && (existingChainIndex === -1 || newChainIndex < existingChainIndex)) {
                                        tokenMap.set(token.symbol, token)
                                      }
                                    }
                                  }
                                  return Array.from(tokenMap.values())
                                })()

                              // Sort tokens: match score first, then popular tokens, then popular chains, then alphabetically
                              uniqueTokens = uniqueTokens.sort((a, b) => {
                                // First: prioritize by match score (exact symbol matches first)
                                if (a.matchScore !== b.matchScore) {
                                  return b.matchScore - a.matchScore
                                }

                                const aTokenIndex = POPULAR_TOKENS.indexOf(a.symbol)
                                const bTokenIndex = POPULAR_TOKENS.indexOf(b.symbol)
                                const aChainIndex = POPULAR_CHAINS.indexOf(a.chain.id)
                                const bChainIndex = POPULAR_CHAINS.indexOf(b.chain.id)

                                // Both are popular tokens - maintain order
                                if (aTokenIndex !== -1 && bTokenIndex !== -1) {
                                  if (aTokenIndex !== bTokenIndex) {
                                    return aTokenIndex - bTokenIndex
                                  }
                                  // Same token, prioritize popular chains
                                  if (aChainIndex !== -1 && bChainIndex !== -1) {
                                    return aChainIndex - bChainIndex
                                  }
                                  if (aChainIndex !== -1) return -1
                                  if (bChainIndex !== -1) return 1
                                  return a.chain.name.localeCompare(b.chain.name)
                                }

                                // Only a is popular
                                if (aTokenIndex !== -1) return -1
                                // Only b is popular
                                if (bTokenIndex !== -1) return 1

                                // Neither is popular - prioritize popular chains
                                if (aChainIndex !== -1 && bChainIndex !== -1) {
                                  return aChainIndex - bChainIndex
                                }
                                if (aChainIndex !== -1) return -1
                                if (bChainIndex !== -1) return 1

                                // Sort by token symbol, then chain name
                                const symbolCompare = a.symbol.localeCompare(b.symbol)
                                if (symbolCompare !== 0) return symbolCompare
                                return a.chain.name.localeCompare(b.chain.name)
                              })

                              if (uniqueTokens.length === 0) {
                                return (
                                  <div className="text-center py-8 text-gray-500 text-sm">
                                    No tokens found
                                  </div>
                                )
                              }

                              // Paginate: only show first N tokens
                              const tokensToDisplay = uniqueTokens.slice(0, toTokensToShow)
                              const hasMore = uniqueTokens.length > toTokensToShow

                              return (
                                <>
                                  {tokensToDisplay.map(({ symbol, name, chain: tokenChain }) => (
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
                                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-mint/10 rounded-lg transition-colors ${toToken.symbol === symbol && toChain.id === tokenChain.id ? 'bg-mint/10' : ''
                                        }`}
                                    >
                                      <TokenIcon symbol={symbol} size={24} chainId={tokenChain.id} />
                                      <div className="flex-1 text-left">
                                        <div className="text-white font-medium">{symbol}</div>
                                        <div className="text-xs text-gray-400">{name} • {tokenChain.name}</div>
                                      </div>
                                    </button>
                                  ))}
                                  {hasMore && (
                                    <div className="text-center py-2 text-xs text-gray-500">
                                      Scroll for more tokens...
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Unified Chain/Token Selector - Show for non-Hyperliquid chains */
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
                          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${toChainFilter === null
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
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${toChainFilter === chain.id
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
                      <div
                        className="p-2 max-h-64 overflow-y-auto"
                        onScroll={(e) => {
                          const target = e.currentTarget
                          const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight
                          // Load more when within 50px of bottom
                          if (scrollBottom < 50) {
                            setToTokensToShow(prev => prev + 15)
                          }
                        }}
                      >
                        {(() => {
                          // Filter tokens based on search and chain filter
                          const filteredChains = toChainFilter
                            ? chains.filter(c => c.id === toChainFilter)
                            : chains

                          const searchQueryLower = toSearchQuery?.toLowerCase() || ''
                          const isPopularTokenSearch = toSearchQuery && POPULAR_TOKENS.includes(toSearchQuery.toUpperCase())
                          const allTokens = filteredChains.flatMap(chain =>
                            getTokensForChain(chain.id)
                              .filter(token => {
                                if (!toSearchQuery) return true

                                // If searching for a popular token, filter out vault/pool tokens unless symbol exactly matches
                                if (isPopularTokenSearch) {
                                  const tokenSymbolUpper = token.symbol.toUpperCase()
                                  const searchUpper = toSearchQuery.toUpperCase()

                                  // If symbol exactly matches, include it (but we'll prioritize standard names)
                                  if (tokenSymbolUpper === searchUpper) {
                                    return true
                                  }

                                  // Otherwise, only include if symbol contains the query (not just name)
                                  return token.symbol.toLowerCase().includes(searchQueryLower)
                                }

                                // Normal search: match symbol, name, or chain
                                return token.symbol.toLowerCase().includes(searchQueryLower) ||
                                  token.name.toLowerCase().includes(searchQueryLower) ||
                                  chain.name.toLowerCase().includes(searchQueryLower)
                              })
                              .map(token => {
                                const nameLower = token.name.toLowerCase()
                                const isVaultToken = nameLower.includes('vault') ||
                                  nameLower.includes('pool') ||
                                  nameLower.includes('yield') ||
                                  nameLower.includes('strategy')

                                return {
                                  ...token,
                                  chain,
                                  isVaultToken,
                                  // Add match score for sorting: exact symbol match = highest priority
                                  matchScore: toSearchQuery ? (
                                    token.symbol.toLowerCase() === searchQueryLower ? (
                                      isVaultToken ? 2.5 : 3 // Exact symbol match, but vault tokens get lower score
                                    ) : token.symbol.toLowerCase().startsWith(searchQueryLower) ? 2 : // Symbol starts with query
                                      token.symbol.toLowerCase().includes(searchQueryLower) ? 1 : // Symbol contains query
                                        0 // Only name/chain match
                                  ) : 0
                                }
                              })
                          )

                          // Only remove duplicates when NOT searching - when searching, show all instances across chains
                          // When deduplicating, keep the token from the most popular chain
                          let uniqueTokens = toSearchQuery
                            ? allTokens // Show all instances when searching
                            : (() => {
                              const tokenMap = new Map<string, typeof allTokens[0]>()
                              for (const token of allTokens) {
                                const existing = tokenMap.get(token.symbol)
                                if (!existing) {
                                  tokenMap.set(token.symbol, token)
                                } else {
                                  // If we already have this token, keep the one from the more popular chain
                                  const existingChainIndex = POPULAR_CHAINS.indexOf(existing.chain.id)
                                  const newChainIndex = POPULAR_CHAINS.indexOf(token.chain.id)
                                  if (newChainIndex !== -1 && (existingChainIndex === -1 || newChainIndex < existingChainIndex)) {
                                    tokenMap.set(token.symbol, token)
                                  }
                                }
                              }
                              return Array.from(tokenMap.values())
                            })()

                          // Sort tokens: match score first, then popular tokens, then popular chains, then alphabetically
                          uniqueTokens = uniqueTokens.sort((a, b) => {
                            // First: prioritize by match score (exact symbol matches first)
                            if (a.matchScore !== b.matchScore) {
                              return b.matchScore - a.matchScore
                            }

                            const aTokenIndex = POPULAR_TOKENS.indexOf(a.symbol)
                            const bTokenIndex = POPULAR_TOKENS.indexOf(b.symbol)
                            const aChainIndex = POPULAR_CHAINS.indexOf(a.chain.id)
                            const bChainIndex = POPULAR_CHAINS.indexOf(b.chain.id)

                            // Both are popular tokens - maintain order
                            if (aTokenIndex !== -1 && bTokenIndex !== -1) {
                              if (aTokenIndex !== bTokenIndex) {
                                return aTokenIndex - bTokenIndex
                              }
                              // Same token, prioritize popular chains
                              if (aChainIndex !== -1 && bChainIndex !== -1) {
                                return aChainIndex - bChainIndex
                              }
                              if (aChainIndex !== -1) return -1
                              if (bChainIndex !== -1) return 1
                              return a.chain.name.localeCompare(b.chain.name)
                            }

                            // Only a is popular
                            if (aTokenIndex !== -1) return -1
                            // Only b is popular
                            if (bTokenIndex !== -1) return 1

                            // Neither is popular - prioritize popular chains
                            if (aChainIndex !== -1 && bChainIndex !== -1) {
                              return aChainIndex - bChainIndex
                            }
                            if (aChainIndex !== -1) return -1
                            if (bChainIndex !== -1) return 1

                            // Sort by token symbol, then chain name
                            const symbolCompare = a.symbol.localeCompare(b.symbol)
                            if (symbolCompare !== 0) return symbolCompare
                            return a.chain.name.localeCompare(b.chain.name)
                          })

                          if (uniqueTokens.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500 text-sm">
                                No tokens found
                              </div>
                            )
                          }

                          // Paginate: only show first N tokens
                          const tokensToDisplay = uniqueTokens.slice(0, toTokensToShow)
                          const hasMore = uniqueTokens.length > toTokensToShow

                          return (
                            <>
                              {tokensToDisplay.map(({ symbol, name, chain: tokenChain }) => (
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
                                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-mint/10 rounded-lg transition-colors ${toToken.symbol === symbol && toChain.id === tokenChain.id ? 'bg-mint/10' : ''
                                    }`}
                                >
                                  <TokenIcon symbol={symbol} size={24} chainId={tokenChain.id} />
                                  <div className="flex-1 text-left">
                                    <div className="text-white font-medium">{symbol}</div>
                                    <div className="text-xs text-gray-400">{name} • {tokenChain.name}</div>
                                  </div>
                                </button>
                              ))}
                              {hasMore && (
                                <div className="text-center py-2 text-xs text-gray-500">
                                  Scroll for more tokens...
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Output Amount */}
              <div className="relative">
                <div className="bridge-input w-full px-4 py-5 pr-32 rounded-xl text-2xl font-semibold text-gray-400 flex items-center justify-between">
                  <span>
                    {loadingQuote ? (
                      <span className="text-sm">Loading quote...</span>
                    ) : quoteError ? (
                      <span className="text-sm text-red-400">{quoteError}</span>
                    ) : (
                      <>
                        {getOutputAmount()} {(() => {
                          // When advanced bridge is off and going to Hyperliquid, always show USDC
                          const isHyperliquidDest = (toChain.id === 'hpl' || toChain.id === 'hyperliquid')
                          if (!showCustomToField && isHyperliquidDest) {
                            return 'USDC'
                          }
                          // Otherwise use the quote's toToken symbol or fallback to toToken state
                          return (quote?.action?.toToken?.symbol || toToken.symbol).replace(' (perps)', '')
                        })()}
                      </>
                    )}
                  </span>
                </div>
                {/* Advanced Bridge Checkbox - Only show for Hyperliquid */}
                {((toChain as any).id === 'hpl' || (toChain as any).id === 'hyperliquid') && (
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="showCustomToField"
                      checked={showCustomToField}
                      onChange={(e) => {
                        setShowCustomToField(e.target.checked)
                        if (!e.target.checked) {
                          setShowToSelector(false)
                        }
                      }}
                      className="w-4 h-4 rounded border border-mint/20 bg-transparent text-mint/60 focus:ring-mint/30 focus:ring-1 checked:bg-mint/10 checked:border-mint/40 appearance-none cursor-pointer transition-colors"
                      style={{
                        backgroundImage: showCustomToField ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23a8f5d0' d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z'/%3E%3C/svg%3E")` : 'none',
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                    />
                    <label htmlFor="showCustomToField" className="text-xs text-gray-400 cursor-pointer">
                      Advanced bridge
                    </label>
                  </div>
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

            {/* Approval Button - HARDCODED: Always show when approval is needed and not fully confirmed */}
            {needsApproval &&
              quote?.estimate.approvalAddress &&
              isConnected &&
              quote &&
              !loadingQuote &&
              (() => {
                // HARDCODED: Show approval button unless ALL of these are true:
                // 1. Approval is confirmed
                // 2. We have approval context
                // 3. Context matches current quote exactly
                // 4. Hash matches context
                const hasFullyValidApproval = 
                  isApprovalConfirmed &&
                  approvalContext &&
                  approvalContext.approvalAddress === quote.estimate.approvalAddress &&
                  approvalContext.tokenAddress === quote.action?.fromToken?.address &&
                  approvalContext.amount === quote.action?.fromAmount &&
                  approvalContext.approvalHash === approvalHash &&
                  approvalContext.approvalHash !== null  // Hash must exist
                
                if (!hasFullyValidApproval) {
                  console.log('[Approval Button] Showing - approval not fully valid', {
                    isApprovalConfirmed,
                    hasContext: !!approvalContext,
                    contextMatches: approvalContext ? (
                      approvalContext.approvalAddress === quote.estimate.approvalAddress &&
                      approvalContext.tokenAddress === quote.action?.fromToken?.address &&
                      approvalContext.amount === quote.action?.fromAmount
                    ) : false,
                    hashMatches: approvalContext?.approvalHash === approvalHash,
                    hasHash: approvalContext?.approvalHash !== null,
                  })
                }
                
                return !hasFullyValidApproval
              })() && (
                <button
                  onClick={handleApproval}
                  disabled={isApproving || isApprovalConfirming}
                  className="pill-button w-full text-lg py-5 mt-4 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApproving
                    ? 'Approving...'
                    : isApprovalConfirming
                    ? 'Confirming Approval...'
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
                            try {
                              const result = switchChain({ chainId: requiredChainId as number }) as any
                              if (result && typeof result === 'object' && typeof result.catch === 'function') {
                                result.catch((error: any) => {
                                  console.error('Error switching chain:', error)
                                })
                              }
                            } catch (err) {
                              // Ignore - chain switch might not return a promise
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


            {/* Bridge Button - Only show when approval is not needed or has been confirmed with matching hash */}
            {(!needsApproval || (() => {
              // Strict check: approval must be confirmed AND match current context (including hash)
              if (!isApprovalConfirmed) {
                console.log('[Bridge Button] Approval not confirmed')
                return false
              }
              if (!approvalContext || !approvalHash) {
                console.log('[Bridge Button] Missing approval context or hash', { hasContext: !!approvalContext, hasHash: !!approvalHash })
                return false
              }
              const matches = approvalContext.approvalAddress === quote?.estimate?.approvalAddress &&
                             approvalContext.tokenAddress === quote?.action?.fromToken?.address &&
                             approvalContext.amount === quote?.action?.fromAmount &&
                             approvalContext.approvalHash === approvalHash
              if (!matches) {
                console.log('[Bridge Button] Approval context/hash mismatch', {
                  contextAddress: approvalContext.approvalAddress,
                  quoteAddress: quote?.estimate?.approvalAddress,
                  contextHash: approvalContext.approvalHash,
                  currentHash: approvalHash,
                })
              }
              return matches
            })()) && (() => {
              // Keep button disabled if there's an active transaction that hasn't been confirmed
              const hasActiveTransaction = txHash && !isConfirmed && !successDetails && !dismissedTxHashes.has(txHash)
              
              const buttonDisabled = !isConnected ||
                !amount ||
                parseFloat(amount) <= 0 ||
                loadingQuote ||
                !quote ||
                chainMismatch ||
                isPendingTx ||
                isConfirming ||
                isApproving ||
                isApprovalConfirming ||
                isSwitchingChain ||
                isSigningMessage ||
                hasActiveTransaction ||  // Disable if transaction is active
                // Require Hyperliquid address when Hyperliquid is selected
                (((toChain as any).id === 'hpl' || (toChain as any).id === 'hyperliquid') && !showCustomToField && (!hyperliquidAddress || !isAddress(hyperliquidAddress)))
              
              const buttonText = !isMounted || !isConnected
                ? 'Connect Wallet to Bridge'
                : loadingQuote
                  ? 'Loading Quote...'
                  : !quote
                    ? (((toChain as any).id === 'hpl' || (toChain as any).id === 'hyperliquid') && !showCustomToField && (!hyperliquidAddress || !isAddress(hyperliquidAddress)))
                      ? 'Enter Hyperliquid Address'
                      : 'Enter Amount'
                    : chainMismatch
                      ? 'Switch Chain First'
                      : isSwitchingChain
                        ? 'Switching Chain...'
                        : isSigningMessage
                          ? 'Signing Message...'
                          : hasActiveTransaction || isPendingTx || isConfirming
                            ? isConfirming ? 'Confirming...' : (hasActiveTransaction ? 'Processing...' : 'Processing...')
                            : isConfirmed
                              ? 'Bridge Complete!'
                              : 'Bridge'

              console.log('[Button State]', {
                buttonText,
                buttonDisabled,
                isConnected,
                hasAmount: !!amount,
                amountValue: amount,
                loadingQuote,
                hasQuote: !!quote,
                needsApproval,
                isApprovalConfirmed,
                chainMismatch,
                isPendingTx,
                isConfirming,
                isApproving,
                isApprovalConfirming,
                isSwitchingChain,
                isSigningMessage,
                isConfirmed,
                txHash,
                successTxHash,
              })

              return (
                <button
                  disabled={buttonDisabled}
                  onClick={handleBridge}
                  className="pill-button w-full text-lg py-5 mt-4"
                >
                  {buttonText}
                </button>
              )
            })()}

            {/* Approval Transaction Status - Hide when success popup is showing */}
            {/* Only show if approval hash matches current approval context and approval is actually needed */}
            {approvalHash && !successDetails && needsApproval && (() => {
              // Check if approval context matches current quote AND hash matches
              const approvalMatches = approvalContext &&
                approvalContext.approvalAddress === quote?.estimate?.approvalAddress &&
                approvalContext.tokenAddress === quote?.action?.fromToken?.address &&
                approvalContext.amount === quote?.action?.fromAmount &&
                approvalContext.approvalHash === approvalHash  // Hash must match
              
              // Only show if we have a matching approval context and hash
              if (!approvalMatches) {
                return null
              }
              
              return (
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
              )
            })()}

            {/* Transaction Status - Hide when success popup is showing */}
            {txHash && !successDetails && (
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

            {/* Transaction Error - Hide when success popup is showing */}
            {txError && !successDetails && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="text-sm text-red-400">Transaction Error</div>
                <div className="text-xs text-red-300 mt-1">
                  {txError.message || 'Transaction failed'}
                </div>
              </div>
            )}
          </div>

          {/* Success Popup - Show when successDetails is set, regardless of isConfirmed state */}
          {successDetails && successTxHash && txHash && txHash === successTxHash && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bridge-card rounded-3xl p-8 max-w-md w-full text-center space-y-4 relative">
                {/* Close button */}
                <button
                  onClick={() => {
                    console.log('[Success Popup] Closing popup and refreshing page')
                    // Refresh the entire page to reset all state
                    window.location.reload()
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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
                  {/* Show Hyperliquid portfolio link if bridging to Hyperliquid */}
                  {(successDetails.toChain === 'Hyperliquid' || toChain.id === 'hpl' || toChain.id === 'hyperliquid') && (
                    <a
                      href="https://app.hyperliquid.xyz/portfolio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill-button w-full mt-4 block text-center"
                    >
                      View Portfolio on Hyperliquid
                    </a>
                  )}
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
