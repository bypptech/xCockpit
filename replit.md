# Overview

xCockpit is a Web3-powered IoT device control dashboard that implements the HTTP 402 Payment Required protocol for cryptocurrency-based device access. The system enables users to control IoT devices (ESP32-based) by making USDC payments through Coinbase Wallet, with real-time communication via WebSocket. Built as a full-stack TypeScript application, it demonstrates modern Web3 integration patterns with traditional IoT infrastructure.

The project serves as both a functional IoT payment gateway and a comprehensive example of Web3 AI Vibe Coding methodology, utilizing multiple AI development tools (Claude, Gemini, Kiro, GitHub Copilot) for enhanced development workflow.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI System**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack React Query for server state with custom hooks for local state
- **Web3 Integration**: Coinbase Wallet SDK for wallet connection and USDC payments
- **Real-time Communication**: WebSocket hooks for live device status updates
- **Mini Apps Support**: Farcaster Frame integration with MiniAppProvider for social context
- **Social Features**: Viral sharing, achievements, leaderboards, and social proof mechanisms

## Backend Architecture
- **Runtime**: Node.js with Express.js and TypeScript
- **HTTP 402 Protocol**: Custom x402 service implementing Payment Required flow with signature verification
- **Payment Processing**: Multi-phase verification including HMAC signatures, nonce management, and blockchain transaction verification
- **IoT Communication**: WebSocket server for ESP32 device control and status monitoring
- **Security**: Session-based access control with 15-minute time windows, replay attack prevention

## Data Storage Architecture
- **Development**: In-memory storage with Map-based data structures
- **Production Ready**: Drizzle ORM configured for PostgreSQL with Neon Database
- **Schema Design**: Users identified by wallet address, devices with pricing metadata, payments with transaction hashes, time-limited sessions

## Web3 Integration Patterns
- **Network Support**: Base Sepolia (testnet) and Base Mainnet with automatic network switching
- **Payment Flow**: Direct USDC transfers bypassing traditional approve/transferFrom pattern
- **Smart Wallet Compatible**: Automatic detection and support for Coinbase Smart Wallets
- **Transaction Verification**: On-chain verification of USDC transfers with configurable confirmation requirements

## x402 Protocol Implementation
The system implements an enhanced HTTP 402 Payment Required protocol:
1. **Initial Request**: Client attempts device command without payment
2. **402 Response**: Server returns payment requirements with HMAC-signed headers
3. **Payment Execution**: Client processes USDC payment via Coinbase Wallet
4. **Verification**: Server validates payment on-chain and grants device access
5. **Session Management**: Time-limited access tokens prevent repeated payments

## Security Architecture
- **Payment Validation**: Multi-layer verification including HMAC signatures, blockchain confirmation, and nonce expiration
- **Session Control**: JWT-like session tokens with device-specific access control
- **Replay Protection**: Order management system prevents transaction replay attacks
- **Network Isolation**: Separate configurations for testnet and mainnet environments

# External Dependencies

## Web3 Services
- **Coinbase Wallet SDK**: Primary wallet connection and payment processing
- **Base Network**: Layer 2 Ethereum scaling solution for low-cost USDC transactions
- **USDC Token**: Circle's stablecoin on Base Sepolia (0x036CbD53842c5426634e7929541eC2318f3dCF7e) and Base Mainnet (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)

## Database and Infrastructure
- **Neon Database**: PostgreSQL-compatible serverless database for production
- **Drizzle ORM**: Type-safe database toolkit with migration support
- **Base RPC Endpoints**: Blockchain connectivity for transaction verification

## Development and Testing
- **Jest**: Testing framework with custom x402 protocol test suites
- **WebSocket**: Real-time communication for IoT device status
- **Express.js**: RESTful API server with middleware for payment processing

## AI Development Tools
- **Context7 MCP**: Project context management for AI assistants
- **Sequential Thinking MCP**: Step-by-step problem-solving enhancement
- **OpenZeppelin MCP**: Smart contract development patterns and security

The architecture prioritizes security, user experience, and scalability while maintaining compatibility with standard Web3 wallet interfaces and IoT device protocols.