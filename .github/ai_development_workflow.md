# AI Development Workflow for IoT Payment Gateway

## Copilot Best Practices

### Code Completion Settings
- Enable TypeScript strict mode suggestions
- Use semantic code completion for Web3 APIs
- Configure context-aware suggestions for React hooks

### Prompt Engineering
When requesting code assistance, include:
1. **Context**: Current component or service being worked on
2. **Goal**: Specific functionality to implement
3. **Constraints**: Web3 security requirements, type safety needs
4. **Format**: Expected output format (component, hook, utility)

### Example Prompts
```
// Generate x402 payment verification logic
// Context: server/services/x402.ts
// Requirements: Verify USDC transaction on Base Sepolia
// Security: Validate transaction hash and amount
```

```
// Create React hook for WebSocket device status
// Context: client/src/hooks/
// Requirements: Real-time device state updates
// Error handling: Connection failures and reconnection
```

## Code Review Checklist
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling for Web3 operations
- [ ] Security validation for payment flows
- [ ] Test data attributes for components
- [ ] WebSocket connection cleanup
- [ ] Session timeout handling

## Integration Testing
1. **Wallet Connection**: Test with Coinbase Wallet extension
2. **Payment Flow**: Verify x402 protocol implementation
3. **Device Communication**: Validate WebSocket messaging
4. **Session Management**: Test timeout and cleanup

## Deployment Preparation
- Environment variable validation
- Database migration readiness
- WebSocket server configuration
- CORS and security headers