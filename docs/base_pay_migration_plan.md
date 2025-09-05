# Base Pay Library 移行計画書

## 概要

現在のCoinbase Wallet SDKベースの決済システムから、Base Payライブラリを使用した決済システムへの移行計画です。Base Payは、Baseチェーン上での決済をより簡単かつ安全に実装できるライブラリで、特にUSDC決済に最適化されています。

## 現在の実装分析

### 現在の決済フロー

1. **Coinbase Wallet SDK**を使用した直接的なUSDC送金
2. コンポーネント:
   - `PaymentModal.tsx`: 決済UIコンポーネント
   - `coinbase-wallet.ts`: ウォレット接続・送金ロジック
   - `x402-client.ts`: 決済確認エンドポイント

3. 決済プロセス:
   ```
   ユーザー → ウォレット接続 → USDC送金 → トランザクション確認 → x402エンドポイントに通知
   ```

### 現在の実装の課題

- **手動のガス推定**: ガス量の手動計算が必要
- **エラーハンドリングの複雑性**: 各種エラーケースの手動処理
- **トランザクション管理**: トランザクション状態の手動追跡
- **UX の改善余地**: 決済フローが複数ステップに分かれている

## Base Pay ライブラリの利点

### 主要機能

1. **簡素化された決済フロー**
   - ワンクリック決済
   - 自動的なウォレット接続処理
   - トランザクション状態の自動管理

2. **改善されたUX**
   - 決済ウィジェットの提供
   - モバイル最適化されたUI
   - リアルタイムのトランザクション追跡

3. **セキュリティ強化**
   - 署名検証の自動化
   - レート制限の組み込み
   - 不正防止機能

4. **開発効率の向上**
   - 型安全なTypeScript SDK
   - 包括的なエラーハンドリング
   - テスト環境のサポート

## 移行計画

### Phase 1: 準備段階（1-2日）

#### 1.1 Base Pay SDKのインストール

```bash
npm install @base-org/pay-sdk
```

#### 1.2 環境変数の追加

```env
# Base Pay Configuration
BASE_PAY_PROJECT_ID=your_project_id
BASE_PAY_MERCHANT_ID=your_merchant_id
BASE_PAY_API_KEY=your_api_key
BASE_PAY_WEBHOOK_SECRET=your_webhook_secret

# Network Configuration
BASE_PAY_NETWORK=sepolia # or mainnet for production
BASE_PAY_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

#### 1.3 型定義の準備

```typescript
// types/base-pay.ts
export interface BasePayConfig {
  projectId: string;
  merchantId: string;
  apiKey: string;
  network: 'sepolia' | 'mainnet';
  usdcAddress: string;
}

export interface PaymentRequest {
  amount: string;
  currency: 'USDC';
  recipient: string;
  metadata?: {
    deviceId: string;
    command: string;
    userId?: string;
  };
}

export interface PaymentResult {
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
}
```

### Phase 2: Base Pay サービスの実装（2-3日）

#### 2.1 Base Pay サービスクラスの作成

```typescript
// app/lib/base-pay-service.ts
import { BasePay } from '@base-org/pay-sdk';

export class BasePayService {
  private basePay: BasePay;

  constructor(config: BasePayConfig) {
    this.basePay = new BasePay({
      projectId: config.projectId,
      merchantId: config.merchantId,
      apiKey: config.apiKey,
      network: config.network,
    });
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    // Base Pay決済の作成
  }

  async verifyPayment(transactionHash: string): Promise<boolean> {
    // 決済の検証
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentResult> {
    // 決済ステータスの取得
  }
}
```

#### 2.2 既存のWalletServiceとの統合

```typescript
// app/lib/wallet-service-adapter.ts
export class WalletServiceAdapter {
  private basePayService: BasePayService;
  private legacyWalletService: WalletService;

  constructor() {
    this.basePayService = new BasePayService(config);
    this.legacyWalletService = walletService;
  }

  async sendPayment(to: string, amount: string): Promise<string> {
    if (process.env.USE_BASE_PAY === 'true') {
      return this.basePayService.createPayment({
        amount,
        currency: 'USDC',
        recipient: to,
      });
    }
    return this.legacyWalletService.sendUSDCPayment(to, amount);
  }
}
```

### Phase 3: UIコンポーネントの更新（2-3日）

#### 3.1 Base Pay ウィジェットの統合

```typescript
// app/components/base-pay-modal.tsx
import { BasePayWidget } from '@base-org/pay-sdk/react';

export function BasePayModal({ 
  device, 
  command, 
  amount, 
  recipient, 
  onSuccess, 
  onError 
}: BasePayModalProps) {
  return (
    <BasePayWidget
      amount={amount}
      recipient={recipient}
      currency="USDC"
      onSuccess={onSuccess}
      onError={onError}
      metadata={{
        deviceId: device.id,
        command: command,
      }}
      theme={{
        primaryColor: '#0052FF',
        borderRadius: '8px',
      }}
    />
  );
}
```

#### 3.2 既存のPaymentModalの更新

```typescript
// app/components/payment-modal.tsx
export default function PaymentModal(props: PaymentModalProps) {
  const useBasePay = process.env.NEXT_PUBLIC_USE_BASE_PAY === 'true';

  if (useBasePay) {
    return <BasePayModal {...props} />;
  }

  // 既存の実装を保持
  return <LegacyPaymentModal {...props} />;
}
```

### Phase 4: バックエンドの統合（1-2日）

#### 4.1 Webhook エンドポイントの実装

```typescript
// app/api/basepay/webhook/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('x-basepay-signature');
  const body = await request.json();

  // 署名検証
  if (!verifyWebhookSignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 決済完了処理
  if (body.event === 'payment.completed') {
    await handlePaymentCompleted(body.data);
  }

  return new Response('OK', { status: 200 });
}
```

#### 4.2 x402エンドポイントとの統合

```typescript
// server/services/payment-adapter.ts
export class PaymentAdapter {
  async submitPaymentProof(
    deviceId: string,
    command: string,
    payment: BasePaymentResult
  ) {
    // Base Payの結果をx402フォーマットに変換
    const x402Payment = {
      amount: payment.amount,
      currency: 'USDC',
      network: 'eip155:84532',
      txHash: payment.transactionHash,
      walletAddress: payment.from,
    };

    return X402Client.submitPayment(deviceId, command, x402Payment);
  }
}
```

### Phase 5: テストと検証（2-3日）

#### 5.1 テスト項目

1. **機能テスト**
   - Base Pay決済フローの動作確認
   - レガシーシステムとの互換性確認
   - エラーハンドリングの検証

2. **統合テスト**
   - x402エンドポイントとの連携確認
   - Webhookの動作確認
   - トランザクション追跡の確認

3. **パフォーマンステスト**
   - 決済速度の測定
   - ガス効率の比較
   - 並行処理の検証

#### 5.2 A/Bテスト戦略

```typescript
// app/lib/feature-flags.ts
export function shouldUseBasePay(userId?: string): boolean {
  // 段階的ロールアウト
  if (!userId) return false;
  
  const rolloutPercentage = parseInt(
    process.env.BASE_PAY_ROLLOUT_PERCENTAGE || '0'
  );
  
  const userHash = hashUserId(userId);
  return (userHash % 100) < rolloutPercentage;
}
```

### Phase 6: 段階的ロールアウト（1週間）

#### 6.1 ロールアウト計画

1. **Day 1-2**: 社内テスト（0%）
2. **Day 3-4**: ベータユーザー（10%）
3. **Day 5-6**: 段階的拡大（50%）
4. **Day 7**: 完全移行（100%）

#### 6.2 モニタリング項目

- 決済成功率
- 平均決済時間
- エラー率
- ユーザーフィードバック
- ガスコスト

## 移行後の構成

### 新しいアーキテクチャ

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   User UI   │────▶│ Base Pay SDK │────▶│ Base Chain │
└─────────────┘     └──────────────┘     └────────────┘
       │                    │                     │
       │                    ▼                     │
       │            ┌──────────────┐             │
       │            │   Webhook    │             │
       │            │   Handler    │             │
       │            └──────────────┘             │
       │                    │                     │
       ▼                    ▼                     ▼
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│ Payment UI  │     │ x402 Service │     │ Transaction│
│   Status    │────▶│   Adapter    │────▶│   History  │
└─────────────┘     └──────────────┘     └────────────┘
```

### 削除予定のコード

1. `coinbase-wallet.ts`の以下の関数:
   - `sendUSDCPayment()` - Base Pay SDKに置換
   - ガス推定ロジック - SDK内で自動処理

2. `payment-modal.tsx`の以下の部分:
   - 手動のトランザクション管理
   - カスタムエラーハンドリング

## リスクと緩和策

### リスク 1: API依存性

**リスク**: Base Pay APIのダウンタイムが決済に影響
**緩和策**: 
- フォールバック機構の実装
- レガシーシステムへの自動切り替え
- APIステータスのモニタリング

### リスク 2: 移行中のデータ整合性

**リスク**: 新旧システム間でのデータ不整合
**緩和策**:
- 両システムでの二重記録
- 定期的な整合性チェック
- ロールバック計画の準備

### リスク 3: ユーザー体験の変化

**リスク**: UIの変更によるユーザー混乱
**緩和策**:
- 段階的なUI更新
- ユーザーガイドの作成
- フィードバック収集システム

## メトリクスとKPI

### 成功指標

1. **技術的指標**
   - 決済成功率: > 99%
   - 平均決済時間: < 5秒
   - エラー率: < 0.1%

2. **ビジネス指標**
   - ユーザー満足度: > 4.5/5
   - サポートチケット削減: 30%
   - 決済完了率向上: 20%

3. **開発指標**
   - コード行数削減: 40%
   - テストカバレッジ: > 80%
   - デプロイ頻度向上: 2x

## タイムライン

| Phase | 期間 | 開始日 | 終了日 | 担当 |
|-------|------|--------|--------|------|
| Phase 1: 準備 | 1-2日 | Day 1 | Day 2 | DevOps |
| Phase 2: 実装 | 2-3日 | Day 3 | Day 5 | Backend |
| Phase 3: UI更新 | 2-3日 | Day 6 | Day 8 | Frontend |
| Phase 4: 統合 | 1-2日 | Day 9 | Day 10 | Full Stack |
| Phase 5: テスト | 2-3日 | Day 11 | Day 13 | QA |
| Phase 6: ロールアウト | 7日 | Day 14 | Day 20 | All |

## まとめ

Base Payライブラリへの移行により、以下のメリットが期待できます:

1. **開発効率の向上**: コード量40%削減、保守性向上
2. **UXの改善**: 決済完了率20%向上、エラー率90%削減
3. **セキュリティ強化**: 自動署名検証、不正防止機能
4. **運用コスト削減**: サポート対応30%削減、ガスコスト最適化

段階的な移行アプローチにより、リスクを最小限に抑えながら、確実な移行を実現します。