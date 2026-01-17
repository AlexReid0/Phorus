'use client'

import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { LEADERBOARD_QUERY, LeaderboardResponse, UserEntity, SUBGRAPH_URLS } from '../lib/graph'
import { formatUnits } from 'viem'
import { motion } from 'framer-motion'
import { Shield, Zap } from 'lucide-react'
import { useState } from 'react'

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
                    userMap.set(user.id, {
                        ...existing,
                        depositVolume: (BigInt(existing.depositVolume) + BigInt(user.depositVolume)).toString(),
                        totalFeesPaid: (BigInt(existing.totalFeesPaid) + BigInt(user.totalFeesPaid)).toString(),
                        bridgeCount: (BigInt(existing.bridgeCount) + BigInt(user.bridgeCount)).toString(),
                        activities: [...existing.activities, ...user.activities]
                            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                            .slice(0, 5)
                    })
                } else {
                    userMap.set(user.id, user)
                }
            })

            // Sort by volume descending
            const aggregatedUsers = Array.from(userMap.values())
                .sort((a, b) => {
                    const volA = BigInt(a.depositVolume)
                    const volB = BigInt(b.depositVolume)
                    return volA > volB ? -1 : volA < volB ? 1 : 0
                })

            return { users: aggregatedUsers }
        }
    })

    if (error) return <div className="text-center p-8 text-red-500">Error loading leaderboard</div>

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-serif text-white mb-2">Leaderboard</h2>
                    <p className="text-sm text-white/50">Top routers this season.</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">
                    <div className="col-span-2 md:col-span-1 text-center">Rank</div>
                    <div className="col-span-5 md:col-span-5">Address</div>
                    <div className="col-span-3 md:col-span-3 text-right">Volume (USDC)</div>
                    <div className="col-span-2 md:col-span-3 text-right">Bridges</div>
                </div>

                <div className="divide-y divide-white/5">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500 font-mono text-sm">Loading data...</div>
                    ) : data?.users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 font-light">No activity recorded yet.</div>
                    ) : (
                        data?.users.map((user, i) => {
                            // Calculate metrics
                            const volRaw = BigInt(user.depositVolume)
                            const volFloat = parseFloat(formatUnits(volRaw, 6))

                            return (
                                <div key={user.id} className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-white/[0.02] ${i < 3 ? "bg-[#A8F5D0]/[0.02]" : ""}`}>
                                    {/* Rank */}
                                    <div className="col-span-2 md:col-span-1 flex justify-center">
                                        {i < 3 ? (
                                            <span className="w-6 h-6 rounded-full bg-[#A8F5D0] text-[#0A1F0A] flex items-center justify-center font-bold text-xs">
                                                {i + 1}
                                            </span>
                                        ) : (
                                            <span className="text-white/50 font-mono text-sm">{i + 1}</span>
                                        )}
                                    </div>

                                    {/* Address */}
                                    <div className="col-span-5 md:col-span-5 text-white font-mono text-sm truncate pr-4 text-[#A8F5D0]">
                                        {user.id}
                                    </div>

                                    {/* Volume */}
                                    <div className="col-span-3 md:col-span-3 text-right font-mono text-[#A8F5D0] text-sm">
                                        ${volFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>

                                    {/* Bridges */}
                                    <div className="col-span-2 md:col-span-3 text-right text-white/60 font-mono text-sm">
                                        {user.bridgeCount}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Footer Disclaimers */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30 pt-2">
                <p>Leaderboard data may be delayed.</p>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-white/40">
                        <Shield className="w-3 h-3" />
                        <span className="uppercase tracking-wider">This is not a testnet</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                        <Zap className="w-3 h-3" />
                        <span className="uppercase tracking-wider">This is not a faucet</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
