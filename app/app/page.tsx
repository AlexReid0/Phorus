import Link from 'next/link'

export default function AppPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Fluid gradient background */}
      <div className="fluid-gradient" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">
            Phorus Application
          </h1>
          <p className="text-xl text-gray-300">
            Application interface coming soon...
          </p>
          <Link 
            href="/" 
            className="inline-block mt-8 text-mint hover:text-mint-dark transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
