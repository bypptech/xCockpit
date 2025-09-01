# x402 Enhanced Payment Protocol - Sequence Diagram

現在動作しているx402強化版支払いプロトコルのシーケンス図

## Overview

このシーケンス図は、**x402標準仕様に準拠した**支払いフローを示しています。BobがArisのIoTデバイスを制御するために、同じリソースに`X-Payment`ヘッダを付けて再送する標準的な方式を実装しています。

### x402標準モデル
1. **初回リクエスト**: `/api/devices/{id}/commands/{command}` → `402 Payment Required`
2. **再送リクエスト**: 同じエンドポイントに `X-Payment` ヘッダを付けて再送
3. **成功レスポンス**: `200 OK` with `X-Payment-State` ヘッダー

## Main Payment Flow

```mermaid
sequenceDiagram
    participant Bob as Bob (Client)
    participant API as xCockpit API
    participant OM as OrderManager
    participant SV as SignatureVerifier
    participant BV as BlockchainVerifier
    participant BC as Base Blockchain
    participant Aris as Aris (IoT Device)
    participant WS as WebSocket Service

    Note over Bob, WS: x402 Enhanced Payment Protocol Flow

    %% 1. Device Control Request
    Bob->>API: POST /api/devices/ESP32_001/commands/dispense
    Note right of Bob: User wants to control IoT device

    %% 2. Payment Required Response Generation
    API->>OM: generateOrder(ttlMinutes=5)
    OM->>OM: Generate order_id & nonce
    OM-->>API: {orderId, nonce, nonceExp}
    
    API->>SV: signPaymentRequirements(requirements)
    SV->>SV: Create HMAC-SHA256 signature
    SV-->>API: {requirementsHeader, signature}

    API->>API: Calculate device price ($0.01 for ESP32_001)
    
    API-->>Bob: HTTP 402 Payment Required
    Note right of API: Headers:<br/>X-Payment-Requirements<br/>X-Payment-Signature<br/>WWW-Authenticate: Payment
    Note right of API: Body:<br/>orderId, nonce, expiresAt<br/>payment.accepts[]

    %% 3. Client Payment Execution
    Bob->>Bob: Parse payment requirements
    Bob->>Bob: Display payment UI<br/>Amount: $0.01 USDC<br/>Network: Base Sepolia (84532)
    
    Bob->>BC: Transfer 0.01 USDC to recipient
    Note right of Bob: MetaMask transaction<br/>to: 0x1c7d4b196cb0c7b01d743fbc6116a902379c7238
    BC-->>Bob: Transaction Hash
    
    %% 4. Payment Proof Re-submission (x402 Standard)
    Bob->>API: POST /api/devices/ESP32_001/commands/dispense (RETRY)
    Note right of Bob: Headers:<br/>X-Payment: base64(payment_data)<br/>X-Payment-Requirements: original_header<br/>X-Payment-Signature: original_signature<br/><br/>Payment data:<br/>amount, currency, network<br/>recipient, metadata{orderId, nonce, txHash}

    %% 5. Enhanced Payment Verification
    alt Enhanced Mode (ENHANCED_X402=true)
        Note over API, OM: Enhanced x402 Verification Process
        
        API->>SV: verifyPaymentRequirements(requirementsHeader, signature)
        SV->>SV: HMAC-SHA256 signature verification
        SV-->>API: signature validation result
        
        API->>OM: validateOrder(orderId, nonce)
        OM->>OM: Check order exists, not used, not expired
        OM-->>API: order validation result
        
        API->>BV: verifyUSDCTransfer(txHash, recipient, amount, minConfirmations)
        BV->>BC: getTransactionReceipt(txHash)
        BC-->>BV: Transaction receipt
        BV->>BC: getBlockNumber()
        BC-->>BV: Current block number
        BV->>BV: Parse USDC Transfer events<br/>Verify recipient & amount<br/>Calculate confirmations
        BV-->>API: {verified: true, confirmations: 3, actualAmount: "0.01"}
        
        API->>OM: consumeOrder(orderId, nonce, txHash)
        OM->>OM: Mark order as used<br/>Store txHash mapping<br/>Prevent replay attacks
        OM-->>API: order successfully consumed
        
    else Basic Mode (ENHANCED_X402=false)
        API->>API: Basic field validation
        Note right of API: Check txHash, amount, recipient present
    end

    %% 6. Device Command Execution
    API->>WS: sendCommandToDevice(ESP32_001, "dispense")
    WS->>Aris: WebSocket command
    Note right of WS: {"command": "dispense", "deviceId": "ESP32_001"}
    Aris->>Aris: Execute dispensing action
    Aris-->>WS: Command executed successfully
    WS-->>API: Device response

    %% 7. Success Response (x402 Standard)
    API-->>Bob: HTTP 200 OK
    Note right of API: Headers:<br/>X-Payment-State: paid; chain="eip155:8453"; tx_hash="0x..."; confirmations="3"<br/><br/>Body:<br/>result: "dispense"<br/>deviceId: "ESP32_001"<br/>paymentId, txHash, confirmations<br/>amount: "0.01", currency: "USDC"<br/>expiresIn: 30

    %% 8. Real-time Updates (Optional)
    WS->>Bob: WebSocket notification
    Note right of WS: Real-time device status update
```

## Error Handling Flows

### Invalid Signature Flow
```mermaid
sequenceDiagram
    participant Bob as Bob (Client)
    participant API as xCockpit API
    participant SV as SignatureVerifier

    Bob->>API: POST /api/devices/ESP32_001/commands/dispense (tampered signature)
    API->>SV: verifyPaymentRequirements(header, signature)
    SV->>SV: HMAC verification fails
    SV-->>API: invalid signature
    API-->>Bob: HTTP 400 Bad Request<br/>{"error": "INVALID_SIGNATURE"}
```

### Replay Attack Prevention
```mermaid
sequenceDiagram
    participant Attacker as Attacker
    participant API as xCockpit API
    participant OM as OrderManager

    Attacker->>API: POST /api/devices/ESP32_001/commands/dispense (reused nonce/orderId)
    API->>OM: validateOrder(orderId, nonce)
    OM->>OM: Check order already used
    OM-->>API: order already used
    API-->>Attacker: HTTP 400 Bad Request<br/>{"error": "ORDER_ALREADY_USED"}
```

### Insufficient Confirmations Flow
```mermaid
sequenceDiagram
    participant Bob as Bob (Client)
    participant API as xCockpit API
    participant BV as BlockchainVerifier
    participant BC as Base Blockchain

    Bob->>API: POST /api/devices/ESP32_001/commands/dispense (with X-Payment header)
    API->>BV: verifyUSDCTransfer(txHash, ..., minConfirmations=2)
    BV->>BC: Get transaction receipt & current block
    BC-->>BV: Receipt + block data
    BV->>BV: Calculate confirmations = 1<br/>(less than required 2)
    BV-->>API: {verified: false, confirmations: 1, error: "Insufficient confirmations"}
    API-->>Bob: HTTP 400 Bad Request<br/>{"error": "INSUFFICIENT_CONFIRMATIONS", "details": {"current": 1, "required": 2}}
```

## Device-Specific Pricing Flow

```mermaid
sequenceDiagram
    participant Bob as Bob (Client)
    participant API as xCockpit API

    Note over Bob, API: Different devices have different pricing

    %% ESP32_001 - Gacha #001
    Bob->>API: POST /api/devices/ESP32_001/commands/dispense
    API->>API: calculateDevicePrice("ESP32_001")<br/>Base: $0.01 USDC<br/>Peak hours (18-22): $0.015 USDC
    API-->>Bob: 402 Payment Required<br/>amount: "0.010" or "0.015"

    %% ESP32_002 - Gacha #002  
    Bob->>API: POST /api/devices/ESP32_002/commands/dispense
    API->>API: calculateDevicePrice("ESP32_002")<br/>Base: $0.005 USDC<br/>Peak hours (18-22): $0.0075 USDC
    API-->>Bob: 402 Payment Required<br/>amount: "0.005" or "0.008"
```

## Network Configuration Flow

```mermaid
sequenceDiagram
    participant API as xCockpit API
    participant Config as Environment Config

    Note over API, Config: Network selection based on environment

    API->>Config: Check NETWORK environment variable
    
    alt NETWORK=sepolia
        Config-->>API: Base Sepolia (84532)<br/>USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
    else NETWORK=mainnet
        Config-->>API: Base Mainnet (8453)<br/>USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    end

    API->>API: Generate 402 response with<br/>appropriate chain & token address
```

## Component Architecture

```mermaid
graph TB
    subgraph "Frontend (React/TypeScript)"
        UI[Device Control UI]
        CS[ConfirmationSettings]
        PS[EnhancedPaymentStatus]
    end
    
    subgraph "Backend Services"
        API[Express API Routes]
        X402[X402Service]
        OM[OrderManager]
        SV[SignatureVerifier]
        BV[BlockchainVerifier]
        WS[WebSocketService]
    end
    
    subgraph "External Services"
        BC[Base Blockchain]
        USDC[USDC Contract]
        IOT[IoT Devices]
    end
    
    UI --> API
    CS --> UI
    PS --> UI
    
    API --> X402
    X402 --> OM
    X402 --> SV
    X402 --> BV
    API --> WS
    
    BV --> BC
    BC --> USDC
    WS --> IOT
    
    style X402 fill:#e1f5fe
    style OM fill:#f3e5f5
    style SV fill:#fff3e0
    style BV fill:#e8f5e8
```

## Key Features Implemented

### Security Features
- **HMAC Signature Verification**: Prevents tampering of payment requirements
- **Nonce Management**: Prevents replay attacks with one-time use tokens
- **Order Expiration**: 5-minute TTL to prevent stale order abuse
- **On-chain Verification**: Real blockchain transaction validation

### Payment Features
- **Multi-Confirmation Support**: 0, 2, or 3 block confirmations
- **Dynamic Pricing**: Device-specific and time-based pricing
- **Multiple Networks**: Base Sepolia (test) and Base Mainnet (production)
- **Real-time Status**: WebSocket updates for device operations

### Error Handling
- **Graceful Degradation**: Falls back to basic mode if enhanced features fail
- **Comprehensive Error Types**: Specific error codes for different failure modes
- **Timeout Management**: Configurable timeouts for blockchain operations
- **Retry Logic**: Automatic retry for network-related failures

## Environment Configuration

| Variable | Sepolia (Test) | Mainnet (Production) |
|----------|---------------|-------------------|
| `NETWORK` | `sepolia` | `mainnet` |
| `ENHANCED_X402` | `true` | `true` |
| Chain ID | `84532` | `8453` |
| USDC Address | `0x036CbD...CF7e` | `0x833589...2913` |
| RPC URL | `https://sepolia.base.org` | `https://mainnet.base.org` |

## Pricing Configuration

| Device | Base Fee | Peak Hours Fee (18:00-22:00) |
|--------|----------|---------------------------|
| ESP32_001 (Gacha #001) | $0.01 USDC | $0.015 USDC |
| ESP32_002 (Gacha #002) | $0.005 USDC | $0.0075 USDC |

この実装により、セキュアで拡張性の高いWeb3 IoTデバイス制御システムが実現されています。