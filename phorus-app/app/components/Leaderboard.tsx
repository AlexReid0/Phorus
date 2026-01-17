'use client'

import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { LEADERBOARD_QUERY, LeaderboardResponse, UserEntity, SUBGRAPH_URL } from '../lib/graph'
import { formatUnits } from 'viem'

export default function Leaderboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: async () => request<LeaderboardResponse>(SUBGRAPH_URL, LEADERBOARD_QUERY)
    })

    if (isLoading) return <div className="text-center p-8 text-gray-500">Loading leaderboard...</div>
    if (error) return <div className="text-center p-8 text-red-500">Error loading leaderboard</div>

    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-serif text-white mb-6">Top Users</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm min-h-[300px] flex flex-col">
                <table className="w-full text-left table-fixed">
                    <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-sm">
                            <th className="p-4 font-normal w-16">Rank</th>
                            <th className="p-4 font-normal">User</th>
                            <th className="p-4 font-normal text-right">Points</th>
                            <th className="p-4 font-normal text-right">Volume</th>
                            <th className="p-4 font-normal text-right">Bridges</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data?.users.map((user, index) => (
                            <tr key={user.id} className="text-white hover:bg-white/5 transition-colors">
                                <td className="p-4 text-gray-500">#{index + 1}</td>
                                <td className="p-4 font-mono text-sm text-mint truncate max-w-[150px] md:max-w-xs">
                                    {user.id}
                                </td>
                                <td className="p-4 text-right font-medium text-yellow-400">
                                    {BigInt(user.depositVolume) >= BigInt(10000000) // 10 USDC (6 decimals)
                                        ? Math.floor(parseFloat(formatUnits(BigInt(user.depositVolume), 6)) / 5).toLocaleString()
                                        : '0'}
                                </td>
                                <td className="p-4 text-right">
                                    ${parseFloat(formatUnits(BigInt(user.depositVolume), 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-right text-gray-300">
                                    {user.bridgeCount}
                                </td>
                            </tr>
                        ))}
                        {data?.users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 h-64 align-middle">
                                    No activity recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
