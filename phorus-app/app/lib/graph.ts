import { GraphQLClient, gql } from 'graphql-request'

// Subgraph URLs for different networks
export const SUBGRAPH_URLS = {
  arbitrum: process.env.NEXT_PUBLIC_SUBGRAPH_ARBITRUM_URL!,
  mainnet: process.env.NEXT_PUBLIC_SUBGRAPH_MAINNET_URL!,
  base: process.env.NEXT_PUBLIC_SUBGRAPH_BASE_URL!
}

export const graphClient = new GraphQLClient(SUBGRAPH_URLS.arbitrum)

export const LEADERBOARD_QUERY = gql`
  query GetLeaderboard($first: Int = 100) {
    users(
      first: $first, 
      orderBy: depositVolume, 
      orderDirection: desc,
      where: {depositVolume_gt: "0"}
    ) {
      id
      depositVolume
      totalFeesPaid
      bridgeCount
      activities(first: 5, orderBy: timestamp, orderDirection: desc) {
        id
        timestamp
        txHash
      }
    }
  }
`

export interface UserEntity {
  id: string
  depositVolume: string
  totalFeesPaid: string
  bridgeCount: string
  activities: {
    id: string
    timestamp: string
    txHash: string
  }[]
}

export interface LeaderboardResponse {
  users: UserEntity[]
}
