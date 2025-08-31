# IoT Payment Gateway - Project Knowledge

## プロジェクト概要
Coinbaseウォレットを使用したIoTデバイス制御のためのWeb3決済ゲートウェイ。x402プロトコルを実装し、テストネット（Base Sepolia）でUSDC決済によるデバイス制御を実現。

## 技術スタック

### フロントエンド
- **React 18** + TypeScript + Vite
- **shadcn/ui** components (Radix UI + TailwindCSS)
- **TanStack React Query** for state management
- **Coinbase Wallet SDK** for Web3 integration
- **WebSocket** for real-time communication

### バックエンド
- **Express.js** + TypeScript
- **HTTP 402 Payment Required** protocol implementation
- **WebSocket Server** for IoT device communication
- **In-memory storage** with PostgreSQL schema ready

### Web3 Integration
- **Base Sepolia testnet** (Chain ID: 84532)
- **USDC token** payments (6 decimals)
- **x402 exact scheme** payment flow
- **Session-based access control** (15-minute windows)

## アーキテクチャパターン

### x402 Payment Flow
1. User clicks device action → POST /api/devices/:id/commands/:command
2. Server returns 402 with payment requirements
3. Client processes payment via Coinbase Wallet
4. Resubmit request with X-PAYMENT header
5. Server verifies payment → executes command → WebSocket to device

### データモデル
- **Users**: Wallet address based identification
- **Devices**: IoT hardware with metadata (price, location)
- **Payments**: USDC transaction records with status
- **Sessions**: Time-limited device access control

## 開発ガイドライン

### コーディング原則
1. **Type Safety**: Strict TypeScript with proper type definitions
2. **Error Handling**: Comprehensive error boundaries and validation
3. **Real-time Updates**: WebSocket for device status and payment notifications
4. **Security**: Payment verification and session management
5. **User Experience**: Loading states, error messages, and progress indicators

### フォルダ構造
```
├── client/src/
│   ├── components/     # UI components with testid attributes
│   ├── lib/           # Utilities (wallet, websocket, x402-client)
│   ├── pages/         # Page components
│   └── hooks/         # Custom React hooks
├── server/
│   ├── services/      # Business logic (payment, websocket, x402)
│   └── routes.ts      # API endpoints
├── shared/
│   └── schema.ts      # Drizzle schema and types
```

### 重要なファイル
- `client/src/lib/coinbase-wallet.ts`: Wallet connection and USDC operations
- `client/src/lib/x402-client.ts`: x402 protocol client implementation
- `server/services/x402.ts`: x402 protocol server logic
- `server/services/websocket.ts`: IoT device WebSocket management
- `shared/schema.ts`: Database schema with proper types