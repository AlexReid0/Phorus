// Direct Hyperliquid integration utilities
// For CoreDepositWallet and other Hyperliquid-specific operations

import { Address, parseUnits, formatUnits } from 'viem'

// CoreDepositWallet contract address on HyperEVM (Arbitrum)
// This is Circle's contract for moving USDC from HyperEVM to HyperCore
// Mainnet: 0x6b9e773128f453f5c2c60935ee2de2cbc5390a24
// Testnet: 0x0b80659a4076e9e93c7dbe0f10675a16a3e5c206
export const CORE_DEPOSIT_WALLET_ADDRESS: Address = '0x6b9e773128f453f5c2c60935ee2de2cbc5390a24'

// Native USDC address on HyperEVM (Arbitrum)
// This is Circle's standard ERC20 USDC - use this for approvals
// Mainnet: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
// Testnet: 0x2B3370eE501B4a559b57D449569354196457D8Ab
export const HYPER_EVM_USDC: Address = '0xb88339CB7199b77E23DB6E890353E22632Ba630f'

// CoreDepositWallet ABI (minimal - just deposit function)
// According to Hyperliquid docs: deposit(uint256 amount, uint32 destinationDex)
// destinationDex: 0 = perps, 4294967295 (type(uint32).max) = spot
export const CORE_DEPOSIT_WALLET_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDex', type: 'uint32' }, // 0 for perps, 4294967295 for spot
    ],
    outputs: [],
  },
] as const

// Destination DEX values
export const PERPS_DEX = 0
export const SPOT_DEX = 4294967295 // type(uint32).max

// ERC20 ABI for approvals
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export interface DepositParams {
  amount: string // Amount in USDC (human-readable, e.g., "100.0")
  destinationDex?: 0 | 4294967295 // 0 for perps, 4294967295 for spot (optional if toSpot is provided)
  toSpot?: boolean // Convenience flag - if true, uses SPOT_DEX, otherwise PERPS_DEX
}

/**
 * Check if user has approved enough USDC for deposit
 */
export async function checkUSDCApproval(
  userAddress: Address,
  amount: bigint,
  publicClient: any
): Promise<boolean> {
  try {
    const allowance = await publicClient.readContract({
      address: HYPER_EVM_USDC,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, CORE_DEPOSIT_WALLET_ADDRESS],
    })

    return allowance >= amount
  } catch (error) {
    console.error('Error checking USDC approval:', error)
    return false
  }
}

/**
 * Get the approval transaction for USDC
 */
export function getApprovalTransaction(amount: bigint) {
  return {
    address: HYPER_EVM_USDC,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [CORE_DEPOSIT_WALLET_ADDRESS, amount],
  }
}

/**
 * Get the deposit transaction for CoreDepositWallet
 * 
 * Note: The deposit() function automatically credits the caller's HyperCore account.
 * There is no recipient parameter - funds always go to the transaction sender.
 * 
 * @param params.amount - Amount in USDC (human-readable, e.g., "100.0")
 * @param params.toSpot - If true, deposit to spot balance (4294967295), otherwise to perps (0). Defaults to true.
 * @param params.destinationDex - Explicit destination dex value (0 for perps, 4294967295 for spot). Overrides toSpot if provided.
 */
export function getDepositTransaction(params: DepositParams) {
  const amount = parseUnits(params.amount, 6) // USDC has 6 decimals on HyperEVM
  
  // Determine destinationDex: explicit value > convenience flag > default to spot
  let destinationDex: 0 | 4294967295
  if (params.destinationDex !== undefined) {
    destinationDex = params.destinationDex
  } else if (params.toSpot !== undefined) {
    destinationDex = params.toSpot ? SPOT_DEX : PERPS_DEX
  } else {
    // Default to spot if neither is provided
    destinationDex = SPOT_DEX
  }

  return {
    address: CORE_DEPOSIT_WALLET_ADDRESS,
    abi: CORE_DEPOSIT_WALLET_ABI,
    functionName: 'deposit' as const,
    args: [amount, destinationDex] as const,
  } as const
}

/**
 * Check if an address is on HyperEVM (Arbitrum)
 */
export function isOnHyperEVM(chainId: number): boolean {
  return chainId === 42161 // Arbitrum mainnet
}

/**
 * Convert Hyperliquid core account address to EVM address format
 * Hyperliquid addresses are different from EVM addresses
 */
export function normalizeHyperliquidAddress(address: string): string {
  // If already in EVM format, return as-is
  if (address.startsWith('0x') && address.length === 42) {
    return address
  }
  
  // TODO: Implement proper Hyperliquid address normalization
  // This might require calling Hyperliquid API or using their SDK
  return address
}
