export default function Home() {
  // SVG Icon Components
  const LightningIcon = () => (
    <svg className="w-10 h-10 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 2L4.5 12h6l-1 10 9-10h-6l1-10z" />
    </svg>
  )

  const LinkIcon = () => (
    <svg className="w-10 h-10 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )

  const CoinsIcon = () => (
    <svg className="w-10 h-10 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  const RocketIcon = () => (
    <svg className="w-6 h-6 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )

  const LockIcon = () => (
    <svg className="w-6 h-6 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )

  const GlobeIcon = () => (
    <svg className="w-6 h-6 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Fluid gradient background */}
      <div className="fluid-gradient" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div className="max-w-6xl mx-auto w-full">
            {/* Main headline */}
            <div className="text-center mb-16">
              <h1 className="text-7xl md:text-8xl lg:text-9xl font-serif font-light italic text-white leading-[0.9] tracking-tight mb-6">
                Phorus
              </h1>
              <p className="text-2xl md:text-3xl text-gray-300 leading-relaxed font-light max-w-3xl mx-auto">
                The bridge to Hyperliquid. Instant. Direct. Seamless.
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center mb-24">
              <a href="https://app.phorus.xyz" className="pill-button text-lg px-12 py-5">
                Launch Bridge
              </a>
            </div>

            {/* Key Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Feature 1: Instant */}
              <div className="feature-card p-6 rounded-2xl border border-mint/20 bg-gradient-to-br from-deep-green/80 to-deep-green/40 backdrop-blur-sm hover:border-mint/40 transition-all duration-300 text-center">
                <div className="mb-4 flex items-center justify-center">
                  <LightningIcon />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Instant Settlement</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Funds appear instantly in your Hyperliquid core account. No waiting, no delays.
                </p>
              </div>

              {/* Feature 2: Direct Integration */}
              <div className="feature-card p-6 rounded-2xl border border-mint/20 bg-gradient-to-br from-deep-green/80 to-deep-green/40 backdrop-blur-sm hover:border-mint/40 transition-all duration-300 text-center">
                <div className="mb-4 flex items-center justify-center">
                  <LinkIcon />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Direct to Core</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Bridge directly to Hyperliquid core accounts. Native integration, zero intermediaries.
                </p>
              </div>

              {/* Feature 3: Low Fees */}
              <div className="feature-card p-6 rounded-2xl border border-mint/20 bg-gradient-to-br from-deep-green/80 to-deep-green/40 backdrop-blur-sm hover:border-mint/40 transition-all duration-300 text-center">
                <div className="mb-4 flex items-center justify-center">
                  <CoinsIcon />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Minimal Fees</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Just 0.1% bridge fee. Infrastructure-level efficiency means lower costs for you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Features Section */}
        <section id="features" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif font-light italic text-white mb-4">
                Built for Hyperliquid
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                A bridge designed from the ground up for the Hyperliquid ecosystem
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Feature Details */}
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center">
                    <RocketIcon />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Instant to Core Accounts</h3>
                    <p className="text-gray-400 leading-relaxed">
                      Your funds arrive instantly in your Hyperliquid core account. No wrapping, no waiting periods. 
                      Start trading immediately after bridging.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center">
                    <LockIcon />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Secure & Trustless</h3>
                    <p className="text-gray-400 leading-relaxed">
                      Built on proven infrastructure with security-first architecture. Your assets are protected 
                      by smart contract security and Hyperliquid's battle-tested infrastructure.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center">
                    <GlobeIcon />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Multi-Chain Support</h3>
                    <p className="text-gray-400 leading-relaxed">
                      Bridge from Ethereum, Arbitrum, Optimism, Base, and more. One bridge to access 
                      the entire Hyperliquid ecosystem.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Visual/Stats */}
              <div className="bg-gradient-to-br from-deep-green/60 to-deep-green/30 border border-mint/20 rounded-3xl p-8 backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-5xl font-light text-mint mb-2">&lt;2 min</div>
                    <div className="text-gray-400">Average Bridge Time</div>
                  </div>
                  <div className="h-px bg-mint/20"></div>
                  <div className="text-center">
                    <div className="text-5xl font-light text-mint mb-2">0.1%</div>
                    <div className="text-gray-400">Bridge Fee</div>
                  </div>
                  <div className="h-px bg-mint/20"></div>
                  <div className="text-center">
                    <div className="text-5xl font-light text-mint mb-2">Instant</div>
                    <div className="text-gray-400">Settlement to Core</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 px-6 bg-gradient-to-b from-transparent to-deep-green/40">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif font-light italic text-white mb-4">
                How It Works
              </h2>
            </div>

            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-mint text-deep-green font-bold flex items-center justify-center text-lg">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Connect your wallet on any supported chain (Ethereum, Arbitrum, Optimism, Base, etc.)
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-mint text-deep-green font-bold flex items-center justify-center text-lg">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Select Amount & Destination</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Choose your token, enter the amount, and optionally specify a Hyperliquid wallet address. 
                    If left empty, funds go to your connected wallet.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-mint text-deep-green font-bold flex items-center justify-center text-lg">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Bridge & Trade Instantly</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Confirm the transaction. Your funds arrive instantly in your Hyperliquid core account, 
                    ready to trade immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-serif font-light italic text-white mb-6">
              Ready to Bridge?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Experience instant, direct bridging to Hyperliquid. Start trading in minutes.
            </p>
            <a href="https://app.phorus.xyz" className="pill-button text-lg px-12 py-5 inline-block">
              Launch Bridge App
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
