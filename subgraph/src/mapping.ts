import { BigInt, Bytes, crypto, ByteArray } from "@graphprotocol/graph-ts"
import { LiFiTransferStarted } from "../generated/LiFiDiamond/LiFiDiamond"
import { User, UserActivity } from "../generated/schema"

// The integrator ID to filter for
const INTEGRATOR_ID = "phorus-2"
// Indexed strings in events are keccak256 hashed. We must compare hashes.
const INTEGRATOR_ID_HASH = crypto.keccak256(ByteArray.fromUTF8(INTEGRATOR_ID))

export function handleLiFiTransferStarted(event: LiFiTransferStarted): void {
    // Event signature: LiFiTransferStarted(indexed bytes32 bridgeTransactionId, indexed string bridge, indexed string integrator, address referrer, address from, address to, uint256 fromAmount, uint256 toAmount)

    // 1. Filter by Integrator ID
    if (event.params.integrator != INTEGRATOR_ID_HASH) {
        return
    }

    const userAddress = event.params.from.toHexString()
    const txHash = event.transaction.hash.toHexString()
    const timestamp = event.block.timestamp

    // 2. Load or Create User
    let user = User.load(userAddress)
    if (!user) {
        user = new User(userAddress)
        user.totalFeesPaid = BigInt.fromI32(0)
        user.depositVolume = BigInt.fromI32(0)
        user.bridgeCount = BigInt.fromI32(0)
    }

    // 3. Update User Stats
    user.depositVolume = user.depositVolume.plus(event.params.fromAmount)

    // Estimate fees as 0.03% (3 basis points) of volume for leaderboard purposes
    // Logic: fees = amount * 3 / 10000
    let estimatedFee = event.params.fromAmount.times(BigInt.fromI32(3)).div(BigInt.fromI32(10000))
    user.totalFeesPaid = user.totalFeesPaid.plus(estimatedFee)

    user.bridgeCount = user.bridgeCount.plus(BigInt.fromI32(1))
    user.updatedAt = timestamp
    user.save()

    // 4. Create Activity Record
    let activityId = txHash + "-" + event.logIndex.toString()
    let activity = new UserActivity(activityId)
    activity.user = user.id
    activity.type = "BRIDGE"
    activity.amount = event.params.fromAmount
    activity.txHash = event.transaction.hash
    activity.blockNumber = event.block.number
    activity.timestamp = timestamp
    activity.save()
}
