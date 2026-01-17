// Script to generate TypeScript code from lifi-tokens.json
const fs = require('fs')
const path = require('path')

const tokensData = JSON.parse(fs.readFileSync(path.join(__dirname, 'lifi-tokens.json'), 'utf8'))

// Generate getTokensForChain function
let tokensCode = '// Tokens available per chain (fetched from LiFi API)\n'
tokensCode += 'const getTokensForChain = (chainId: string): Token[] => {\n'
tokensCode += '  const chainTokens: Record<string, Token[]> = {\n'

for (const [chainName, tokens] of Object.entries(tokensData)) {
  tokensCode += `    ${chainName}: [\n`
  tokens.forEach(token => {
    // Escape single quotes in symbol and name
    const symbol = token.symbol.replace(/'/g, "\\'")
    const name = token.name.replace(/'/g, "\\'")
    tokensCode += `      { symbol: '${symbol}', name: '${name}' },\n`
  })
  tokensCode += '    ],\n'
}

tokensCode += '  }\n'
tokensCode += '  \n'
tokensCode += '  return chainTokens[chainId] || chainTokens.ethereum\n'
tokensCode += '}\n'

// Generate TOKEN_ADDRESSES
let addressesCode = 'export const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {\n'

for (const [chainName, tokens] of Object.entries(tokensData)) {
  addressesCode += `  ${chainName}: {\n`
  tokens.forEach(token => {
    const symbol = token.symbol.replace(/'/g, "\\'")
    if (token.symbol === 'ETH' || token.address === '0x0000000000000000000000000000000000000000') {
      addressesCode += `    '${symbol}': '0x0000000000000000000000000000000000000000', // Native token\n`
    } else {
      addressesCode += `    '${symbol}': '${token.address}',\n`
    }
  })
  addressesCode += '  },\n'
}

addressesCode += '}\n'

// Write to separate files for easier review
fs.writeFileSync(path.join(__dirname, 'generated-tokens.ts'), tokensCode)
fs.writeFileSync(path.join(__dirname, 'generated-addresses.ts'), addressesCode)

console.log('✅ Generated TypeScript code:')
console.log(`   - generated-tokens.ts (${tokensCode.split('\n').length} lines)`)
console.log(`   - generated-addresses.ts (${addressesCode.split('\n').length} lines)`)
