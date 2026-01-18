# Phorus

![Phorus Logo](phorus-app/logo.svg)

**Phorus** is a premium cross-chain bridge application with direct integration to Hyperliquid, enabling seamless asset transfers to your Hyperliquid trading account.

## 🌟 Features

### Direct to Hyperliquid
- **One-Click Bridge**: Send assets directly to your Hyperliquid trading account (perps) without manual token selection
- **Auto-USDC Conversion**: Automatically converts your assets to USDC for Hyperliquid
- **Minimal Steps**: Enter your Hyperliquid address and bridge - that's it

### Advanced Bridge Mode
- **Multi-Chain Support**: Bridge between 20+ EVM chains including Ethereum, Arbitrum, Optimism, Base, Polygon, and more
- **100+ Tokens**: Support for major tokens across all supported chains
- **Optimal Routing**: Powered by LiFi protocol for best rates and routes
- **Custom Destinations**: Choose specific tokens and chains for advanced use cases

### User Experience
- **Real-Time Balance Display**: See your token balances across chains
- **Live Token Icons**: Token and chain logos from Trust Wallet assets
- **Transaction Status Tracking**: Monitor your bridge transactions in real-time
- **Smart Approval Management**: Efficient token approval handling
- **Responsive Design**: Works seamlessly on desktop and mobile

### Leaderboard
- Track top bridgers and volume across the platform
- GraphQL-powered analytics and statistics

## 🎨 Design

Phorus features a premium, minimalist design:
- **Dark Theme**: Black background with organic mint gradients
- **Premium Typography**: High-contrast serif headlines with clean sans-serif UI
- **Mint Accent**: Single `#A8F5D0` accent color throughout
- **Fluid Animations**: Smooth transitions and abstract fluid visuals
- **Trust & Scale**: Design communicates infrastructure-level reliability

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion

### Web3
- **Wallet Connection**: [Reown AppKit](https://reown.com/) (formerly WalletConnect)
- **Ethereum Library**: [Wagmi](https://wagmi.sh/) + [Viem](https://viem.sh/)
- **Bridge Protocol**: [LiFi](https://li.fi/)

### Additional Tools
- **Icons**: Trust Wallet Assets + Lucide React
- **Image Processing**: Sharp
- **Data Fetching**: TanStack React Query
- **Analytics**: GraphQL + The Graph Protocol

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Web3 wallet (MetaMask, WalletConnect-compatible, etc.)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Phorus.git
cd Phorus/phorus-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env.local file
cp .env.example .env.local
```

Add your configuration:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser

### Build for Production

```bash
npm run build
npm start
```

## 📖 Usage

### Direct Mode (Default)
1. Connect your wallet
2. Select source chain and token
3. Enter amount to bridge
4. Enter your Hyperliquid trading account address
5. Click "Approve" (if needed) then "Bridge"
6. Confirm transaction in your wallet
7. Assets arrive directly in your Hyperliquid trading account as USDC

### Advanced Mode
1. Enable "Advanced bridge" toggle
2. Select source and destination chains/tokens
3. Enter amount and destination address
4. Review route and fees
5. Approve and execute bridge transaction

## 🏗️ Project Structure

```
phorus-app/
├── app/
│   ├── components/         # React components
│   │   ├── ChainIcon.tsx   # Chain logo display
│   │   ├── TokenIcon.tsx   # Token logo display with lazy loading
│   │   └── ConnectWallet.tsx
│   ├── utils/              # Utility functions
│   │   ├── lifi.ts         # LiFi API integration
│   │   ├── tokens.ts       # Token definitions
│   │   └── hyperliquid.ts  # Hyperliquid utilities
│   ├── leaderboard/        # Leaderboard page
│   ├── page.tsx            # Main bridge interface
│   └── layout.tsx          # Root layout
├── scripts/
│   ├── fetch-lifi-chains.js    # Fetch chain data
│   ├── fetch-lifi-tokens.js    # Fetch token data
│   ├── generate-favicon.js     # Generate favicons
│   └── generated-*.ts          # Auto-generated constants
├── public/                 # Static assets
└── logo.svg               # Phorus logo
```

## 🔧 Development

### Generate Token/Chain Data
```bash
# Fetch latest chains from LiFi
node scripts/fetch-lifi-chains.js
node scripts/generate-chain-code.js

# Fetch latest tokens from LiFi
node scripts/fetch-lifi-tokens.js
node scripts/generate-token-code.js
```

### Generate Favicons
```bash
node scripts/generate-favicon.js
```

## 🌐 Supported Chains

- Ethereum
- Arbitrum
- Optimism
- Base
- Polygon
- Avalanche
- BNB Chain
- And 15+ more...

## 🔐 Security

- No private keys are ever stored or transmitted
- All transactions require wallet confirmation
- Smart contract interactions are audited via LiFi protocol
- Token approvals are managed securely

## 📊 Analytics

Bridge transaction analytics are tracked via The Graph Protocol subgraph. See `/subgraph` directory for GraphQL schema and queries.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [LiFi Documentation](https://docs.li.fi/)
- [Hyperliquid](https://hyperliquid.xyz/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)

## 💬 Support

For support, please open an issue in the GitHub repository or reach out to the team.

---

Built with ❤️ by the Phorus team
