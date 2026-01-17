# Direct Integration Guide - Bypassing LiFi

This guide explains how to integrate directly with Relay and Hyperliquid's CoreDepositWallet instead of using LiFi as an intermediary.

## Overview

There are two main approaches for direct integration:

1. **Relay API** - Direct integration with Relay's API for cross-chain transfers to Hyperliquid
2. **CoreDepositWallet** - Smart contract integration for HyperEVM → HyperCore transfers

## Option 1: Relay API Direct Integration

### When to Use
- You want to bypass LiFi's abstraction layer
- You need more control over the deposit flow
- You want potentially lower fees (no LiFi markup)
- You're transferring from any chain to Hyperliquid

### How It Works
1. Get a quote from Relay API with `toChainId: 1337` (Hyperliquid)
2. Execute the transaction returned by Relay
3. Monitor status via Relay's status API

### Implementation

```typescript
import { getRelayQuote, getRelayStatus } from './utils/relay'
import { CHAIN_IDS } from './utils/lifi' // For chain ID mapping

// Get quote
const quote = await getRelayQuote({
  fromChainId: CHAIN_IDS[fromChain.id], // e.g., 8453 for Base
  toChainId: 1337, // Hyperliquid
  fromToken: fromTokenAddress, // Token address on source chain
  toToken: '0x...', // USDC address on Hyperliquid (get from LiFi or hardcode)
  fromAmount: parseUnits(amount, decimals).toString(),
  recipient: hyperliquidAddress, // User's Hyperliquid core account
  useDepositAddress: false, // Set to true for certain flows
})

// Execute transaction
sendTransaction({
  to: quote.transaction.to as `0x${string}`,
  value: BigInt(quote.transaction.value),
  data: quote.transaction.data as `0x${string}`,
  gas: BigInt(quote.transaction.gasLimit),
})

// Monitor status
const status = await getRelayStatus(txHash, fromChainId)
```

### Pros
- ✅ Direct control over the flow
- ✅ No LiFi dependency
- ✅ Potentially lower fees
- ✅ Native Hyperliquid support

### Cons
- ❌ Need to handle more edge cases yourself
- ❌ Less route optimization (Relay only, not aggregating multiple bridges)
- ❌ Need to implement status monitoring yourself

## Option 2: CoreDepositWallet (HyperEVM → HyperCore)

### When to Use
- Funds are already on HyperEVM (Arbitrum)
- You want maximum control
- You're doing USDC deposits only
- You want to avoid any third-party APIs

### How It Works
1. User approves USDC on HyperEVM
2. Call `deposit()` or `depositFor()` on CoreDepositWallet contract
3. Funds move directly to HyperCore (spot or perps)

### Implementation

```typescript
import { 
  getApprovalTransaction, 
  getDepositTransaction,
  checkUSDCApproval,
  HYPER_EVM_USDC,
  CORE_DEPOSIT_WALLET_ADDRESS
} from './utils/hyperliquid'
import { parseUnits } from 'viem'

// 1. Check if approval is needed
const amount = parseUnits(amountString, 6) // USDC has 6 decimals
const hasApproval = await checkUSDCApproval(userAddress, amount, publicClient)

if (!hasApproval) {
  // 2. Approve USDC
  await writeContract(getApprovalTransaction(amount))
  // Wait for approval confirmation...
}

// 3. Deposit to HyperCore
const depositTx = getDepositTransaction({
  amount: amountString,
  destinationDex: 0, // 0 for spot, 1 for perps
  recipient: userHyperliquidAddress, // Optional
})

await writeContract(depositTx)
```

### Pros
- ✅ Maximum control
- ✅ No third-party APIs
- ✅ Direct smart contract interaction
- ✅ Lower fees (no bridge aggregator markup)

### Cons
- ❌ Only works if funds are already on HyperEVM
- ❌ Only supports USDC
- ❌ Need to handle bridge to HyperEVM separately
- ❌ More complex error handling

## Hybrid Approach: Bridge to HyperEVM, Then Deposit

For transfers from other chains:

1. **Bridge to HyperEVM** using Relay or another bridge
2. **Deposit to HyperCore** using CoreDepositWallet

```typescript
// Step 1: Bridge from Base → Arbitrum (HyperEVM)
const bridgeQuote = await getRelayQuote({
  fromChainId: 8453, // Base
  toChainId: 42161, // Arbitrum (HyperEVM)
  fromToken: baseUSDC,
  toToken: arbitrumUSDC,
  fromAmount: amount,
  recipient: userAddress, // User's Arbitrum address
})

// Execute bridge transaction
await sendTransaction(bridgeQuote.transaction)

// Wait for confirmation...

// Step 2: Deposit from HyperEVM → HyperCore
const depositTx = getDepositTransaction({
  amount: amountString,
  destinationDex: 0, // Spot
})

await writeContract(depositTx)
```

## Integration into page.tsx

To add direct integration as an option:

1. **Add a toggle** to choose between LiFi and direct integration
2. **Create a new fetch function** that uses Relay/CoreDepositWallet
3. **Update handleBridge** to support both paths

Example:

```typescript
const [useDirectIntegration, setUseDirectIntegration] = useState(false)

const fetchQuote = async () => {
  if (useDirectIntegration && isHyperliquidDirect) {
    // Use Relay API
    const quote = await getRelayQuote({...})
    setQuote(quote)
  } else {
    // Use LiFi (existing code)
    const routesData = await getRoutes({...})
  }
}
```

## Finding Contract Addresses

### CoreDepositWallet Address
- Check Circle's CCTP documentation
- Or query Hyperliquid's contracts on Arbitrum
- Current address: TBD (needs to be updated in `hyperliquid.ts`)

### USDC Addresses
- Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Arbitrum: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- Hyperliquid: Query from LiFi API or Hyperliquid docs

## Security Considerations

1. **Always verify contract addresses** before deploying
2. **Test with small amounts first**
3. **Handle approval edge cases** (partial approvals, etc.)
4. **Monitor for failed transactions**
5. **Implement proper error handling**

## Testing Checklist

- [ ] Test Relay API quote fetching
- [ ] Test Relay transaction execution
- [ ] Test Relay status monitoring
- [ ] Test USDC approval flow
- [ ] Test CoreDepositWallet deposit
- [ ] Test hybrid approach (bridge + deposit)
- [ ] Test error handling (insufficient balance, failed transactions)
- [ ] Test with different amounts
- [ ] Verify funds arrive in HyperCore (not just HyperEVM)

## Next Steps

1. **Get actual CoreDepositWallet address** and update `hyperliquid.ts`
2. **Test Relay API** with real transactions
3. **Add UI toggle** for direct vs LiFi integration
4. **Implement status monitoring** for Relay transactions
5. **Add error handling** and user feedback
6. **Compare fees** between LiFi and direct integration

## Resources

- Relay API Docs: https://docs.relay.link/
- CoreDepositWallet: https://developers.circle.com/cctp/references/coredepositwallet-contract-interface
- Hyperliquid Bridge Docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/bridge2
