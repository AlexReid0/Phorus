import Leaderboard from '../components/Leaderboard'
import Link from 'next/link'

export default function LeaderboardPage() {
    return (
        <main className="min-h-screen relative overflow-x-hidden bg-black">
            <div className="fluid-gradient opacity-50" />

            <div className="relative z-10 min-h-screen px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Swap
                        </Link>
                        <h1 className="text-3xl font-serif font-light italic text-white">Leaderboard</h1>
                        <p className="text-gray-400 mt-2">Top Phorus Users</p>
                    </div>

                    <Leaderboard />
                </div>
            </div>
        </main>
    )
}
