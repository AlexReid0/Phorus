/**
 * Format wallet address for display
 * @param address - Full wallet address
 * @param chars - Number of characters to show on each side (default: 4)
 * @returns Formatted address like "0x1234...5678"
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return ''
  if (address.length <= chars * 2 + 2) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format balance for display
 * @param balance - Balance as string
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted balance
 */
export function formatBalance(balance: string, decimals: number = 4): string {
  if (!balance) return '0.00'
  const num = parseFloat(balance)
  if (isNaN(num)) return '0.00'
  if (num === 0) return '0.00'
  if (num < 0.0001) return '<0.0001'
  return num.toFixed(decimals)
}

/**
 * Format large numbers with K, M, B suffixes
 * @param num - Number to format
 * @returns Formatted string
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toFixed(2)
}
