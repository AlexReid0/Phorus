'use client'

import Leaderboard from '../components/Leaderboard'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Trophy } from 'lucide-react'

export default function LeaderboardPage() {
    return (
        <div className="bg-black min-h-screen text-white font-sans selection:bg-[#A8F5D0] selection:text-[#0A1F0A] overflow-x-hidden">
            {/* Global Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#A8F5D0]/5 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#A8F5D0]/5 blur-[120px]" />
            </div>

            {/* Nav */}
            <nav className="fixed z-50 top-0 left-0 w-full border-b border-white/5 bg-black/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex justify-between items-center">
                    <Link href="/">
                        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                            <span className="font-serif text-xl font-bold italic tracking-tight text-[#A8F5D0]">Phorus</span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-8 font-sans text-sm font-medium">
                        <span className="text-white/50 cursor-not-allowed">How it Works</span>
                        <span className="text-white/50 cursor-not-allowed">About</span>
                        <span className="text-[#A8F5D0] cursor-default">Points</span>
                        <span className="text-white/50 cursor-not-allowed">Docs</span>
                    </div>

                    <Link href="/"
                        className="px-5 py-2 bg-[#A8F5D0] text-[#0A1F0A] rounded-full text-xs font-bold hover:bg-[#A8F5D0]/90 transition-colors inline-block">
                        Launch App
                    </Link>
                </div>
            </nav>

            <main className="container mx-auto px-6 pt-32 pb-24 relative z-10">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="grid lg:grid-cols-2 gap-16 mb-24"
                >
                    {/* Left Content */}
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#A8F5D0] animate-pulse"></span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-medium">
                                Season 1 is live
                            </span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-serif text-white tracking-tight leading-[1.1]">
                            Use Phorus. <br />
                            <span className="italic text-[#A8F5D0] opacity-90">Earn your place.</span>
                        </h1>

                        <p className="text-lg text-white/50 font-sans tracking-wide max-w-md leading-relaxed">
                            Phorus points reward real usage. <br />
                            Every swap routed, every bridge completed, every deposit made through Phorus moves you up the leaderboard and earns you credit for future rewards.
                        </p>

                        <div className="pt-4">
                            <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#A8F5D0] text-[#0A1F0A] hover:bg-[#A8F5D0]/90 transition-all duration-300 font-bold">
                                Start routing
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Right Stats Card */}
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#A8F5D0]/20 to-transparent blur-2xl opacity-50" />
                        <div className="relative h-full bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 flex flex-col justify-between overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Trophy className="w-48 h-48 text-[#A8F5D0]" />
                            </div>

                            <div className="space-y-8 relative z-10">
                                <div>
                                    <div className="text-4xl md:text-5xl font-serif text-white font-medium mb-2 lining-nums">
                                        10 Million
                                    </div>
                                    <div className="text-sm uppercase tracking-[0.2em] text-[#A8F5D0]/80 font-medium">
                                        Points distributed every week
                                    </div>
                                </div>

                                <div className="space-y-4 pt-8 border-t border-white/10">
                                    {[
                                        "Points are earned by using Phorus",
                                        "More volume and consistency earn more points",
                                        "Rankings update continuously",
                                        "Seasons define distribution windows"
                                    ].map((text, i) => (
                                        <div key={i} className="flex items-start gap-3 text-sm text-white/70">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#A8F5D0]" />
                                            <span>{text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Leaderboard Integration */}
                <Leaderboard />

                {/* Disclaimer Tease */}
                <div className="mt-24 text-center">
                    <p className="text-white/20 text-xs tracking-widest uppercase">
                        Points may play a role in future Phorus incentives.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 bg-black py-12 relative z-20">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-2xl font-serif font-bold italic text-[#A8F5D0]">Phorus</div>
                    <div className="flex gap-8 text-sm text-gray-500">
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="https://x.com/AlexReid01" target="_blank" rel="noopener noreferrer"
                            className="hover:text-white transition-colors">Twitter</a>
                    </div>
                    <div className="text-sm text-gray-600">
                        © 2026 Phorus. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
