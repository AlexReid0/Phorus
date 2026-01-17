'use client'

import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { LEADERBOARD_QUERY, LeaderboardResponse, UserEntity, SUBGRAPH_URLS } from '../lib/graph'
import { formatUnits } from 'viem'

export default function Leaderboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: async () => {
            // Fetch from all subgraphs in parallel
            const queries = Object.entries(SUBGRAPH_URLS).map(async ([network, url]) => {
                try {
                    const result = await request<LeaderboardResponse>(url, LEADERBOARD_QUERY)
                    return result.users || []
                } catch (e) {
                    console.error(`Failed to fetch leaderboard for ${network}:`, e)
                    return []
                }
            })

            const results = await Promise.all(queries)
            const allUsers = results.flat()

            // Aggregate users by ID
            const userMap = new Map<string, UserEntity>()

            allUsers.forEach(user => {
                const existing = userMap.get(user.id)
                if (existing) {
                    // correct big int math using string manipulation or BigInt
                    userMap.set(user.id, {
                        ...existing,
                        depositVolume: (BigInt(existing.depositVolume) + BigInt(user.depositVolume)).toString(),
                        totalFeesPaid: (BigInt(existing.totalFeesPaid) + BigInt(user.totalFeesPaid)).toString(),
                        bridgeCount: (BigInt(existing.bridgeCount) + BigInt(user.bridgeCount)).toString(),
                        // Combine activities and sort by timestamp desc
                        activities: [...existing.activities, ...user.activities]
                            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                            .slice(0, 5) // Keep top 5 latest
                    })
                } else {
                    userMap.set(user.id, user)
                }
            })

            // Convert back to array and sort by total volume
            const aggregatedUsers = Array.from(userMap.values())
                .sort((a, b) => {
                    const volA = BigInt(a.depositVolume)
                    const volB = BigInt(b.depositVolume)
                    return volA > volB ? -1 : volA < volB ? 1 : 0
                })

            return { users: aggregatedUsers }
        }
    })

    if (isLoading) return <div className="text-center p-8 text-gray-500">Loading leaderboard...</div>
    if (error) return <div className="text-center p-8 text-red-500">Error loading leaderboard</div>

    return (
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header section moved to page.tsx, just the table container here */}

            <div className="bg-black/20 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-widest font-medium">
                            <th className="py-6 pl-8 w-24">Rank</th>
                            <th className="py-6 px-4">User</th>
                            {/* Points column hidden per request */}
                            {/* <th className="py-6 px-8 text-right w-32">Points</th> */}
                            <th className="py-6 px-8 text-right w-48">Volume (USDC)</th>
                            <th className="py-6 pr-12 text-right w-24">Bridges</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data?.users.map((user, index) => (
                            <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors duration-300">
                                <td className="py-5 pl-8 font-mono text-sm text-gray-600 group-hover:text-gray-500 transition-colors">
                                    {(index + 1).toString().padStart(2, '0')}
                                </td>
                                <td className="py-5 px-4 relative">
                                    {/* Gradient mask for fading out the address before it hits the next column */}
                                    <div className="relative max-w-[180px] sm:max-w-[250px] md:max-w-[350px] lg:max-w-[400px]">
                                        <div className="font-mono text-sm text-[#94f2d3] truncate"
                                            style={{ maskImage: 'linear-gradient(to right, black 90%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)' }}>
                                            {user.id}
                                        </div>
                                    </div>
                                </td>
                                {/* Points column hidden
                                <td className="py-5 px-8 text-right">
                                    <span className="font-sans font-bold text-white tracking-tight tabular-nums">
                                        {BigInt(user.depositVolume) >= BigInt(10000000) // 10 USDC (6 decimals)
                                            ? Math.floor(parseFloat(formatUnits(BigInt(user.depositVolume), 6)) / 5).toLocaleString()
                                            : '0'}
                                    </span>
                                </td> */}
                                <td className="py-5 px-8 text-right">
                                    <span className="text-gray-300 font-light tracking-wide tabular-nums">
                                        ${parseFloat(formatUnits(BigInt(user.depositVolume), 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td className="py-5 pr-12 text-right text-gray-400 font-mono text-sm">
                                    {user.bridgeCount}
                                </td>
                            </tr>
                        ))}
                        {data?.users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-24 text-center text-gray-500 font-light">
                                    No activity recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 text-center text-xs text-gray-600 font-light">
                Updates every few minutes • Tracking USDC bridging volume only
            </div>
        </div>
    )
}
