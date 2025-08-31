# Development Guide - IoT Payment Gateway

## Quick Start

### Prerequisites
- Node.js 20+
- Coinbase Wallet browser extension
- Base Sepolia testnet USDC (for testing)
- Supabase account (for database)

### Setup
1. Clone and install dependencies
2. Configure DATABASE_URL in Replit secrets
3. Start development server: `npm run dev`
4. Connect Coinbase Wallet to Base Sepolia testnet

## Architecture Overview

### Core Components

#### Frontend (`client/src/`)
```
├── components/          # React UI components
│   ├── ui/             # shadcn/ui base components
│   ├── device-card.tsx # Device control interface
│   ├── payment-modal.tsx # x402 payment flow
│   └── wallet-connection.tsx # Coinbase Wallet integration
├── lib/                # Core utilities
│   ├── coinbase-wallet.ts # Wallet SDK wrapper
│   ├── x402-client.ts  # x402 protocol client
│   └── websocket.ts    # WebSocket hook
└── pages/              # Route components
    └── dashboard.tsx   # Main application interface
```

#### Backend (`server/`)
```
├── services/           # Business logic
│   ├── x402.ts        # x402 protocol implementation
│   ├── payment.ts     # Payment processing
│   └── websocket.ts   # IoT device communication
├── routes.ts          # API endpoints
└── storage.ts         # Data persistence layer
```

### Key Features

#### 1. x402 Payment Protocol
```typescript
// Payment flow example
POST /api/devices/ESP32_001/commands/unlock
→ 402 Payment Required (if no X-PAYMENT header)
→ Client processes USDC payment
→ Resubmit with X-PAYMENT header
→ Server verifies → executes command → WebSocket to device
```

#### 2. WebSocket Communication
- Real-time device status updates
- Command acknowledgments from ESP32
- Session status notifications

#### 3. Session Management
- 15-minute access windows after payment
- Automatic cleanup of expired sessions
- Visual countdown timers in UI

## AI Development Integration

### Tool Configuration
- **Claude**: Primary coding assistant (`.claude/`)
- **Gemini**: Architecture review (`.gemini/`)
- **Kiro**: Project management (`.kiro/`)
- **VS Code**: Optimized settings (`.vscode/`)

### Development Workflow
1. **Planning**: Use Gemini for requirement analysis
2. **Implementation**: Use Claude for TypeScript/React code
3. **Review**: Multi-tool validation and optimization
4. **Testing**: Automated and manual validation

## Testing Strategy

### Unit Tests
- x402 protocol functions
- WebSocket message handling
- Payment validation logic

### Integration Tests
- End-to-end payment flow
- Device communication
- Session management

### Manual Testing
- Wallet connection flow
- Device control operations
- Error handling scenarios

## Security Considerations

### Web3 Security
- Transaction validation
- Wallet address verification
- Session token management

### API Security
- Input validation
- Error message sanitization
- Rate limiting (future enhancement)

## Deployment

### Environment Variables
- `DATABASE_URL`: Supabase connection string
- `VITE_USDC_CONTRACT_ADDRESS`: USDC token address
- `VITE_PAYMENT_RECIPIENT`: Payment recipient address

### Build Process
```bash
npm run build    # Build for production
npm run dev      # Development server
npm run db:push  # Sync database schema
```

## Troubleshooting

### Common Issues
1. **WebSocket Connection Failed**: Check server is running on correct port
2. **Payment Verification Failed**: Verify Base Sepolia testnet connection
3. **Device Not Responding**: Check ESP32 WebSocket connection
4. **Type Errors**: Run TypeScript compiler with `npx tsc --noEmit`

### Debug Tools
- Browser DevTools for WebSocket monitoring
- Network tab for API request debugging
- Console logs for payment flow tracking

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow React functional component patterns
- Add `data-testid` attributes for testing
- Implement proper error boundaries

### Git Workflow
1. Create feature branch
2. Implement with AI assistance
3. Test thoroughly
4. Submit pull request with AI-generated documentation