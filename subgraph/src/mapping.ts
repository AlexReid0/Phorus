import { BigInt, Bytes, crypto, ByteArray, log } from "@graphprotocol/graph-ts"
import { LiFiTransferStarted } from "../generated/LiFiDiamond/LiFiDiamond"
import { User, UserActivity } from "../generated/schema"

// The integrator ID to filter for
const INTEGRATOR_ID = "phorus-2"
// Indexed strings in events are keccak256 hashed. We must compare hashes.
const INTEGRATOR_ID_HASH = crypto.keccak256(ByteArray.fromUTF8(INTEGRATOR_ID))

export function handleLiFiTransferStarted(event: LiFiTransferStarted): void {
    // 1. Debug Logging
    const bridgeData = event.params.bridgeData
    log.info("Checking event - Tx: {} - Integrator: {}", [
        event.transaction.hash.toHexString(),
        bridgeData.integrator
    ])

    // 2. Filter by Integrator ID
    if (bridgeData.integrator != INTEGRATOR_ID) {
        log.info("Skipping event - Integrator mismatch. Expected: {}, Found: {}", [INTEGRATOR_ID, bridgeData.integrator])
        return
    }

    // 3. Filter by Asset (USDC Only for now)
    const USDC_ADDRESSES: string[] = [
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Mainnet
        "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // Arbitrum Native
        "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", // Arbitrum Bridged
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Base
    ]

    const sendingAsset = bridgeData.sendingAssetId.toHexString().toLowerCase()
    let isUsdc = false
    for (let i = 0; i < USDC_ADDRESSES.length; i++) {
        if (sendingAsset == USDC_ADDRESSES[i]) {
            isUsdc = true
            break
        }
    }

    if (!isUsdc) {
        log.info("Skipping event - Non-USDC asset: {}", [sendingAsset])
        return
    }

    const userAddress = event.transaction.from.toHexString()
    const txHash = event.transaction.hash.toHexString()
    const timestamp = event.block.timestamp

    // 3. Load or Create User
    let user = User.load(userAddress)
    if (!user) {
        user = new User(userAddress)
        user.totalFeesPaid = BigInt.fromI32(0)
        user.depositVolume = BigInt.fromI32(0)
        user.bridgeCount = BigInt.fromI32(0)
    }

    // 4. Update User Stats
    user.depositVolume = user.depositVolume.plus(bridgeData.minAmount)

    // Estimate fees as 0.1% (10 basis points) of volume
    // Logic: fees = amount * 10 / 10000
    let estimatedFee = bridgeData.minAmount.times(BigInt.fromI32(10)).div(BigInt.fromI32(10000))
    user.totalFeesPaid = user.totalFeesPaid.plus(estimatedFee)

    user.bridgeCount = user.bridgeCount.plus(BigInt.fromI32(1))
    user.updatedAt = timestamp
    user.save()

    // 4. Create Activity Record
    let activityId = txHash + "-" + event.logIndex.toString()
    let activity = new UserActivity(activityId)
    activity.user = user.id
    activity.type = "BRIDGE"
    activity.amount = bridgeData.minAmount
    activity.txHash = event.transaction.hash
    activity.blockNumber = event.block.number
    activity.timestamp = timestamp
    activity.save()
}
