# xCockpit 🚀

**xCockpit** - Web3-powered IoT device control dashboard with x402 payments

## Overview

xCockpit is a next-generation IoT control dashboard that combines Web3 payments with real-time device management. Users can control IoT devices by making USDC payments through Coinbase Wallet (including Smart Wallets) using the x402 payment protocol.

## Features

### 🔗 **Web3 Integration**
- **Coinbase Wallet Support**: Full integration with Coinbase Wallet SDK
- **Smart Wallet Compatible**: Automatic detection and support for Smart Wallets
- **Multi-Network**: Base Sepolia and Sepolia Ethereum testnets
- **Real-time Balance**: USDC and ETH balance display with auto-refresh

### 💳 **x402 Payment Protocol**
- **HTTP 402 Payment Required**: Standard-compliant payment requests
- **USDC Payments**: Native USDC token support on Base and Ethereum
- **Transaction Verification**: On-chain payment verification
- **Payment History**: Complete transaction tracking

### 🎛️ **IoT Device Control**
- **WebSocket Communication**: Real-time device connectivity
- **ESP32 Support**: Direct communication with ESP32 devices
- **Command Authentication**: Payment-gated device operations
- **Status Monitoring**: Live device status and health checks

### 🎨 **Modern UI/UX**
- **Responsive Design**: Mobile-first responsive interface
- **Dark/Light Mode**: Theme support
- **Real-time Updates**: Live balance and status updates
- **Network Switching**: Easy network switching interface

## Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Lightning-fast development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **TanStack Query** - Server state management

### Backend
- **Express.js** - RESTful API server
- **TypeScript** - Type-safe server code
- **WebSocket** - Real-time communication
- **Drizzle ORM** - Type-safe database operations

### Web3 & Payments
- **Coinbase Wallet SDK** - Wallet connectivity
- **x402 Protocol** - Payment-gated API access
- **USDC on Base/Ethereum** - Stablecoin payments
- **Multi-network Support** - Testnet and mainnet ready

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Coinbase Wallet (browser extension or mobile)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd xcockpit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5000
   ```

## Configuration

### Environment Variables

```env
# USDC Contract Addresses
VITE_USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Network Configuration
VITE_NETWORK_NAME=Base Sepolia
VITE_CHAIN_ID=84532
VITE_RPC_URL=https://sepolia.base.org

# API Configuration
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

### Supported Networks

| Network | Chain ID | USDC Contract | Status |
|---------|----------|---------------|---------|
| Base Sepolia | 84532 | 0x036CbD...CF7e | ✅ Active |
| Sepolia Ethereum | 11155111 | 0x1c7D4B...C7238 | ✅ Active |
| Base Mainnet | 8453 | 0x833589...2913 | 🔄 Ready |
| Ethereum Mainnet | 1 | 0xA0b869...eB48 | 🔄 Ready |

## Usage

### 1. Connect Wallet
- Click "Connect Wallet" in the top right
- Select Coinbase Wallet (Browser Extension or Mobile)
- Approve connection and network switch

### 2. Check Balance
- View your USDC and ETH balances in the balance card
- Balances update automatically every 30 seconds
- Manual refresh available

### 3. Control Devices
- Select an IoT device from the dashboard
- Click the desired command (e.g., "Unlock")
- Confirm the USDC payment in your wallet
- Device will execute the command after payment verification

### 4. Monitor Activity
- View real-time WebSocket connection status
- Check payment history in the transaction panel
- Monitor device status and responses

## Development

### Project Structure
```
xcockpit/
├── client/          # Frontend React app
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── lib/        # Utilities and services
│   │   ├── pages/      # Application pages
│   │   └── hooks/      # Custom React hooks
├── server/          # Backend Express server
│   ├── routes.ts    # API endpoints
│   ├── services/    # Business logic
│   └── storage.ts   # Data storage
├── shared/          # Shared types and schemas
└── docs/           # Documentation
```

### Key Components

- **`balance-card.tsx`** - Wallet balance display with Smart Wallet detection
- **`wallet-connection.tsx`** - Coinbase Wallet integration
- **`device-card.tsx`** - IoT device control interface
- **`payment-modal.tsx`** - x402 payment processing
- **`coinbase-wallet.ts`** - Wallet service with multi-network support

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@xcockpit.dev
- 💬 Discord: [Join our community](https://discord.gg/xcockpit)
- 📖 Documentation: [docs.xcockpit.dev](https://docs.xcockpit.dev)

---

**Built with ❤️ using Web3 AI VibeCoding**