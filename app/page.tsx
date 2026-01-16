export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Fluid gradient background */}
      <div className="fluid-gradient" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          {/* Main headline */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-white leading-tight tracking-tight">
            Phorus
          </h1>
          
          {/* Protocol description */}
          <div className="space-y-6 max-w-2xl mx-auto">
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
              A bridge directly integrated into Hyperliquid
            </p>
            
            <div className="pt-8 space-y-4 text-left text-gray-400">
              <p className="text-lg leading-relaxed">
                Phorus seamlessly connects your assets to the Hyperliquid ecosystem, 
                providing a direct, secure, and efficient bridge for cross-chain transactions.
              </p>
              <p className="text-lg leading-relaxed">
                Built with infrastructure-level precision, Phorus enables instant transfers 
                with minimal fees, leveraging Hyperliquid's advanced trading infrastructure 
                for a next-generation DeFi experience.
              </p>
              <p className="text-lg leading-relaxed">
                Experience the future of decentralized finance with a bridge designed for 
                scale, trust, and seamless integration.
              </p>
            </div>
          </div>
          
          {/* Launch App Button */}
          <div className="pt-12">
            <a href="https://app.phorus.xyz" className="pill-button inline-block text-lg">
              Launch App
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
