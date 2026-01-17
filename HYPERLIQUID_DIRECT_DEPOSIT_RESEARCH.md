# Hyperliquid Direct Deposit Integration Research

## Executive Summary

To enable **direct transfers to Hypercore without requiring users to click "Deposit"** on the Hyperliquid interface, you have several options. The best approach depends on your specific use case, but **LiFi + Relay** (which you're already using) is the most straightforward path.

## Current Implementation Status

Your codebase already has:
- ✅ LiFi integration with `executionType: 'all'` for Hyperliquid
- ✅ Direct routing to Hyperliquid (chain ID 1337)
- ✅ Messaging flow support via `relayMessage()`
- ✅ Hyperliquid core account address handling

**What's working:** You're already using LiFi's "Step Into HyperCore" feature which uses Relay and Gas.zip for intent-based flows. This should theoretically bypass the manual deposit step.

## Available Solutions

### 1. **LiFi + Relay (Recommended - Already Partially Implemented)**

**What it does:**
- LiFi's "Step Into HyperCore" feature provides one-step routes directly into HyperCore
- Uses Relay and Gas.zip for intent-based flow
- Users sign once and funds land on HyperCore ready for trading

**How it works:**
- Set `toChainId = 1337` (Hyperliquid chain ID)
- Use `executionType: 'all'` in route options (you already have this)
- Pass the Hyperliquid core account address as `toAddress`
- LiFi handles the bridge + deposit in one flow

**Implementation:**
```typescript
// Already in your code at page.tsx:5906-5921
const routesData = await getRoutes({
  fromChain: fromChain.id,
  toChain: toChain.id, // 'hpl' = 1337
  fromToken: fromToken.symbol,
  toToken: 'USDC',
  fromAmount: amount,
  fromAddress: address,
  toAddress: normalizedHyperliquidAddress,
  slippage: 0.03,
})
```

**What you need to verify:**
- Ensure `executionType: 'all'` is being passed correctly (you have this at line 423 in lifi.ts)
- Verify that routes are using messaging flow when available
- Check if you need to call `relayMessage()` after user signs

### 2. **Relay API Direct Integration**

**What it does:**
- Relay has native Hyperliquid support
- Can deposit directly to Hyperliquid perps USDC
- Supports `toChainId = 1337` and `useDepositAddress: true` for withdrawals

**API Parameters:**
- `toChainId: 1337` (Hyperliquid chain ID)
- `recipient`: User's Hyperliquid address
- `useDepositAddress: true` (for certain flows)

**When to use:**
- If you want more control over the deposit flow
- If you need to bypass LiFi's abstraction layer
- For custom deposit logic

**Implementation:**
```typescript
// Direct Relay API call
const quote = await fetch('https://api.relay.link/quote', {
  method: 'POST',
  body: JSON.stringify({
    fromChainId: fromChainId,
    toChainId: 1337, // Hyperliquid
    fromToken: fromTokenAddress,
    toToken: usdcAddress,
    fromAmount: amount,
    recipient: hyperliquidAddress,
  })
})
```

### 3. **CoreDepositWallet (For HyperEVM → HyperCore)**

**What it does:**
- Circle's contract for moving USDC from HyperEVM to HyperCore
- Functions: `deposit()`, `depositFor()`, `depositWithAuth()`
- Requires USDC approval first

**When to use:**
- If funds are already on HyperEVM
- For direct smart contract integration
- When you need fine-grained control

**⚠️ Critical Warning:**
- **DO NOT** send USDC directly to CoreDepositWallet address without calling a deposit function
- Funds sent directly will be **LOST FOREVER**
- Always use the contract functions: `deposit()`, `depositFor()`, or `depositWithAuth()`

**Implementation:**
```typescript
// 1. Approve USDC
await usdcContract.approve(coreDepositWalletAddress, amount)

// 2. Call deposit
await coreDepositWallet.deposit(amount, destinationDex) // 0 for spot, 1 for perps
```

### 4. **LayerZero + Stargate (For OFT Tokens)**

**What it does:**
- LayerZero's Hyperliquid Bridge enables direct transfers via OFT standard
- Stargate supports one-click deposits for specific tokens (USDT0, USDe, USR, thBILL, XAUT0)
- Native cross-chain movement without wrapping

**When to use:**
- For OFT-compliant tokens
- When you need native token support (not wrapped)
- For specific stablecoins supported by Stargate

**Supported tokens:**
- USDT0, USDe, USR, thBILL, XAUT0 (via Stargate)
- Any OFT-compliant token

### 5. **HyperUnit (For Native Assets)**

**What it does:**
- Allows depositing native BTC, ETH, SOL into Hyperliquid
- Receives on-chain spot assets inside Hyperliquid
- Can be used for trading (spot/perps)

**When to use:**
- For native asset deposits (BTC, ETH, SOL)
- When users want to avoid wrapping

## Recommended Implementation Strategy

### Phase 1: Optimize Current LiFi Implementation (Easiest)

1. **Verify messaging flow is working:**
   - Check if routes returned by LiFi include messaging steps
   - Ensure `relayMessage()` is called when needed
   - Verify signatures are being handled correctly

2. **Add explicit messaging flow handling:**
```typescript
// In your route execution
if (step.type === 'messaging' || step.action?.type === 'messaging') {
  // User signs EIP-712 message
  const signature = await signTypedData(...)
  // Relay the message
  await relayMessage(step, signature)
}
```

3. **Monitor transaction status:**
   - Use LiFi's status API to track when funds arrive
   - Poll Hyperliquid API to confirm balance update

### Phase 2: Add Relay Direct Integration (If Needed)

If LiFi's abstraction isn't sufficient:

1. **Add Relay API as fallback:**
```typescript
// Check if Relay route is better
const relayQuote = await fetchRelayQuote({
  fromChainId,
  toChainId: 1337,
  fromToken,
  toToken: 'USDC',
  amount,
  recipient: hyperliquidAddress,
})
```

2. **Compare routes:**
   - Compare LiFi vs Relay quotes
   - Choose best route based on fees/time

### Phase 3: Smart Contract Integration (Advanced)

For maximum control:

1. **Integrate CoreDepositWallet:**
   - Only if funds are on HyperEVM
   - Requires careful approval handling
   - Must handle errors gracefully

## Key Technical Requirements

### 1. **Address Handling**
- Hyperliquid uses a different address format than EVM
- Core account addresses vs EVM addresses
- You're already handling this with `normalizedHyperliquidAddress`

### 2. **Token Support**
- USDC is the primary supported token
- Other tokens may need linking via Hyperliquid's token linking flow
- OFT tokens can use LayerZero bridge

### 3. **Gas & Fees**
- Users pay gas on source chain
- Some messaging flows can be gasless (via relayers)
- Consider gas sponsorship for better UX

### 4. **Error Handling**
- Handle failed bridges gracefully
- Provide clear error messages
- Implement retry logic for transient failures

## Critical Warnings & Considerations

### ⚠️ **DO NOT:**
1. Send tokens directly to CoreDepositWallet without calling deposit functions
2. Assume all tokens are supported (verify token linking status)
3. Skip approval steps (users must approve before deposit)

### ✅ **DO:**
1. Always verify token addresses before transfers
2. Monitor transaction status and confirm on Hyperliquid
3. Handle edge cases (insufficient gas, slippage, etc.)
4. Provide clear user feedback during multi-step flows

## Testing Checklist

- [ ] Test with small amounts first
- [ ] Verify funds arrive in HyperCore (not just HyperEVM)
- [ ] Check balance updates on Hyperliquid
- [ ] Test with different source chains
- [ ] Verify error handling for failed transactions
- [ ] Test with different tokens (if supported)
- [ ] Verify messaging flow signatures work
- [ ] Test gas estimation and actual costs

## Next Steps

1. **Immediate:** Verify your current LiFi implementation is using messaging flow correctly
2. **Short-term:** Add explicit messaging flow handling and status monitoring
3. **Medium-term:** Consider Relay direct integration as fallback
4. **Long-term:** Evaluate CoreDepositWallet for HyperEVM → HyperCore flows

## Resources

- **LiFi Docs:** https://docs.li.fi/introduction/user-flows-and-examples/messaging-flow
- **Relay Docs:** https://docs.relay.link/guides/hyperliquid-support
- **Hyperliquid Bridge Docs:** https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/bridge2
- **CoreDepositWallet:** https://developers.circle.com/cctp/references/coredepositwallet-contract-interface
- **LayerZero Hyperliquid Bridge:** https://layerzero.network/blog/introducing-the-hyperliquid-bridge

## Conclusion

**You're already 80% there!** Your current implementation using LiFi with `executionType: 'all'` should support direct deposits to HyperCore. The main things to verify are:

1. Messaging flow is being used when available
2. Signatures are being relayed correctly
3. Transaction status is being monitored
4. Funds are confirmed on HyperCore (not just in transit)

If the current implementation isn't working as expected, the issue is likely in the messaging flow execution or signature handling, not in the route selection.
