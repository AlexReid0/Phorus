// Script to fetch supported tokens from LiFi API and generate hardcoded token lists
// Run with: node scripts/fetch-lifi-tokens.js

const CHAIN_IDS = {
  ethereum: 1,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  hyperliquid: 1337,
}

const LIFI_API_BASE = 'https://li.quest/v1'

async function fetchTokensForChain(chainId, chainName) {
  try {
    console.log(`Fetching tokens for ${chainName} (chain ID: ${chainId})...`)
    
    // Fetch all tokens
    const tokensResponse = await fetch(`${LIFI_API_BASE}/tokens`)
    if (!tokensResponse.ok) {
      console.error(`Failed to fetch tokens: ${tokensResponse.status}`)
      return []
    }
    
    const tokensData = await tokensResponse.json()
    // LiFi API returns tokens organized by chainId: { "1": [...], "42161": [...] }
    const chainTokens = tokensData.tokens?.[chainId.toString()] || []
    
    // Get unique tokens by symbol, prefer tokens with addresses
    const tokenMap = new Map()
    chainTokens.forEach(token => {
      if (token.symbol && token.address) {
        const symbol = token.symbol.toUpperCase()
        if (!tokenMap.has(symbol) || token.address !== '0x0000000000000000000000000000000000000000') {
          tokenMap.set(symbol, {
            symbol: symbol,
            name: token.name || symbol,
            address: token.address,
          })
        }
      }
    })
    
    // Convert to array and sort by symbol
    const tokens = Array.from(tokenMap.values())
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
    
    console.log(`Found ${tokens.length} tokens for ${chainName}`)
    return tokens
  } catch (error) {
    console.error(`Error fetching tokens for ${chainName}:`, error)
    return []
  }
}

async function main() {
  console.log('Fetching tokens from LiFi API...\n')
  
  const results = {}
  
  for (const [chainName, chainId] of Object.entries(CHAIN_IDS)) {
    const tokens = await fetchTokensForChain(chainId, chainName)
    results[chainName] = tokens
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Output as JSON for easier parsing
  const fs = require('fs')
  const path = require('path')
  const outputPath = path.join(__dirname, 'lifi-tokens.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n✅ Saved ${Object.keys(results).length} chains to ${outputPath}`)
  
  // Also output summary
  console.log('\n=== SUMMARY ===\n')
  for (const [chainName, tokens] of Object.entries(results)) {
    console.log(`${chainName}: ${tokens.length} tokens`)
  }
}

main().catch(console.error)
