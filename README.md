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

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js) or **yarn**
- **Coinbase Wallet** - [Browser Extension](https://wallet.coinbase.com/) or Mobile App
- **Base Sepolia Testnet USDC** - Get free testnet USDC from [Base Sepolia Faucet](https://docs.base.org/tools/network-faucets/)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/xcockpit.git
   cd xcockpit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   
   Create environment files:
   ```bash
   # Backend environment
   touch .env
   ```
   
   Add to `.env`:
   ```env
   # Backend Configuration
   PORT=5001
   NODE_ENV=development
   
   # Payment Configuration
   PAYMENT_RECIPIENT=0x1c7d4b196cb0c7b01d743fbc6116a902379c7238
   
   # Database
   DATABASE_URL=sqlite:./database.db
   ```

   Frontend configuration (create `client/.env`):
   ```env
   # Frontend Configuration
   VITE_BACKEND_PORT=5001
   
   # USDC Contract (Base Sepolia)
   VITE_USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
   
   # Network Configuration
   VITE_NETWORK_NAME=Base Sepolia
   VITE_CHAIN_ID=84532
   VITE_RPC_URL=https://sepolia.base.org
   ```

4. **Start the development servers**
   
   **Terminal 1 - Backend Server:**
   ```bash
   PORT=5001 npm run dev
   ```
   
   **Terminal 2 - Frontend Server:**
   ```bash
   VITE_BACKEND_PORT=5001 npx vite --port 3000
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

### 🎯 Initial Setup Steps

#### 1. **Setup Coinbase Wallet**
- Install [Coinbase Wallet browser extension](https://wallet.coinbase.com/)
- Create a new wallet or import existing
- **Important**: Switch to **Base Sepolia testnet**

#### 2. **Get Test USDC**
- Visit [Base Sepolia Faucet](https://docs.base.org/tools/network-faucets/)
- Or use [Coinbase Faucet](https://faucet.quicknode.com/base/sepolia)
- Get both **ETH** (for gas) and **USDC** (for payments)
- Recommended: 0.01 ETH + 1 USDC for testing

#### 3. **Test the Application**
- Connect your wallet in the app (top-right button)
- Verify your USDC and ETH balances appear
- Try a device command (e.g., "Play Gacha" for $0.005 USDC)
- Confirm the payment in your wallet

## ⚡ Troubleshooting

### Common Issues

#### 🔧 **"Cannot find module" or build errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 🔧 **"Port already in use" errors**
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9  # Frontend port
lsof -ti:5001 | xargs kill -9  # Backend port
```

#### 🔧 **Wallet connection issues**
- Ensure Coinbase Wallet extension is installed and unlocked
- Switch to Base Sepolia network in your wallet
- Clear browser cache and refresh the page

#### 🔧 **"Insufficient gas" errors**
- Get more ETH from [Base Sepolia ETH Faucet](https://docs.base.org/tools/network-faucets/)
- Recommended: Keep at least 0.005 ETH for gas fees

#### 🔧 **USDC balance not updating**
- Check if you're on the correct network (Base Sepolia)
- Wait 30 seconds for auto-refresh or click the refresh button
- Verify transaction on [Base Sepolia Explorer](https://sepolia-explorer.base.org/)

### Development Servers Status

**✅ Both servers running correctly when you see:**
- Backend: `Server running on port 5001` + `WebSocket server listening`
- Frontend: `Local: http://localhost:3000/` + `ready in X ms`

## 📚 Advanced Configuration

### Environment Variables Reference

#### Backend (.env)
```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Payment Configuration
PAYMENT_RECIPIENT=0x1c7d4b196cb0c7b01d743fbc6116a902379c7238

# Database Configuration  
DATABASE_URL=sqlite:./database.db

# Optional: Custom RPC endpoints
BASE_SEPOLIA_RPC=https://sepolia.base.org
SEPOLIA_RPC=https://rpc.sepolia.org
```

#### Frontend (client/.env)
```env
# Development Configuration
VITE_BACKEND_PORT=5001

# USDC Contract Addresses
VITE_USDC_CONTRACT_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Network Settings
VITE_NETWORK_NAME=Base Sepolia
VITE_CHAIN_ID=84532
VITE_RPC_URL=https://sepolia.base.org

# Optional: API endpoints
VITE_API_URL=http://localhost:5001
VITE_WS_URL=ws://localhost:5001
```

### Supported Networks

| Network | Chain ID | USDC Contract | RPC Endpoint | Status |
|---------|----------|---------------|--------------|---------|
| **Base Sepolia** | 84532 | `0x036CbD...CF7e` | https://sepolia.base.org | ✅ **Recommended** |
| Sepolia Ethereum | 11155111 | `0x1c7D4B...C7238` | https://rpc.sepolia.org | ✅ Active |
| Base Mainnet | 8453 | `0x833589...2913` | https://mainnet.base.org | 🔄 Production Ready |
| Ethereum Mainnet | 1 | `0xA0b869...eB48` | https://eth.llamarpc.com | 🔄 Production Ready |

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