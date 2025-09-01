# x402実装比較：現在のxCockpit vs 本格Base USDC仕様

## 概要

現在のxCockpitプロジェクトで実装されているx402（HTTP 402 Payment Required）プロトコルと、本格的なBase Mainnet USDCを使用した即時認可システムとの仕様比較解析です。

**ロール定義**
- **Bob（ユーザー）**: USDC支払いを行うクライアント側
- **Aris（IoTデバイス）**: 支払い後に操作を実行するデバイス側
- **Service API**: x402プロトコルを処理するサーバー

---

## 🔄 実装比較マトリックス

| 要素 | 現在のxCockpit実装 | 提供された本格仕様 | 実装難易度 |
|------|-------------------|------------------|-----------|
| **ネットワーク** | Base Sepolia (84532) | **Base Mainnet (8453)** | 🟢 Easy |
| **USDC契約** | `0x036Cb...CF7e` | `0x8335...2913` | 🟢 Easy |
| **確認数** | 設定なし | **`min_confirmations=0〜3`** | 🟡 Medium |
| **nonce/order_id** | ❌ なし | **✅ 実装済み** | 🔴 Complex |
| **署名検証** | ❌ なし | **✅ HMAC-SHA256** | 🔴 Complex |
| **トランザクション検証** | ❌ フィールドチェックのみ | **✅ フルオンチェーン検証** | 🔴 Complex |
| **二重支払い防止** | ❌ なし | **✅ order_id管理** | 🟡 Medium |
| **エラーハンドリング** | 基本的 | **詳細なステータス管理** | 🟡 Medium |

---

## 📋 詳細比較

### 1. ネットワーク・トークン設定

#### 🔹 現在のxCockpit
```typescript
// server/services/x402.ts:49-50
network: 'eip155:84532', // Base Sepolia
asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
```

#### 🔹 提供仕様
```typescript
chain: "eip155:8453", // Base Mainnet
token: "erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
```

**🔧 移行作業**
- 環境変数でネットワーク切り替え対応
- メインネット用USDC契約アドレス更新

### 2. 支払い要件ヘッダー設計

#### 🔹 現在のxCockpit
```json
{
  "payment": {
    "accepts": [{
      "scheme": "exact",
      "network": "eip155:84532",
      "asset": "0x036CbD...",
      "amount": "0.01",
      "recipient": "0x1c7d4b..."
    }]
  }
}
```

#### 🔹 提供仕様
```
X-PAYMENT-REQUIREMENTS: scheme="x402-exact",
  chain="eip155:8453",
  token="erc20:0x833589...",
  amount="12.34", currency="USDC",
  to="0xArisServiceWallet",
  min_confirmations="0",
  order_id="ord_7QmZ...3f",
  nonce="nx_9d8a...ef",
  nonce_exp="2025-09-01T09:05:00Z",
  callback="https://api.aris.example/payhooks/base"
X-PAYMENT-SIGNATURE: v1=HMAC-SHA256(key=server_secret, data=<requirements-line>)
```

**🚨 重要な違い**
- **nonce/order_id管理**: リプレイ攻撃防止
- **署名検証**: 改ざん検知
- **min_confirmations**: 即時可用性制御

### 3. 支払い検証ロジック

#### 🔹 現在のxCockpit
```typescript
// server/services/x402.ts:90-94
static async verifyPayment(payment: X402PaymentRequest): Promise<boolean> {
  // ❌ フィールドの存在チェックのみ
  return !!(payment.amount && payment.currency && payment.network && payment.metadata?.txHash);
}
```

#### 🔹 提供仕様
```typescript
// フルオンチェーン検証
static async verifyPayment(payment: X402PaymentRequest): Promise<boolean> {
  // 1. トランザクション存在確認
  const receipt = await getReceipt(payment.metadata.txHash);
  if (!receipt || receipt.status !== 1 || !receipt.blockNumber) return false;
  
  // 2. USDC Transfer イベント検証
  const transferOk = await checkErc20Transfer({
    txHash: payment.metadata.txHash,
    token: USDC_ADDRESS,
    to: payment.recipient,
    minValue: toUnits(payment.amount, 6),
  });
  
  // 3. confirmations チェック
  const conf = await getConfirmations(receipt.blockNumber);
  if (conf < payment.min_confirmations) return false;
  
  return transferOk;
}
```

### 4. デバイス制御フロー

#### 🔹 現在のxCockpit
```typescript
// server/routes.ts:92-96 - WebSocket経由でデバイス制御
const commandSent = await wsService.sendCommandToDevice(deviceId, command, {
  userId: user.id,
  paymentId: result.payment.id
});
```

#### 🔹 提供仕様
```typescript
// IoT制御 + 時限制御
const ok = await controlAris({ deviceId, cmd });
const expiresIn = 30; // 秒

return {
  result: cmd,
  expires_in: expiresIn, // 自動リセット機能
  X-PAYMENT-STATE: `paid; chain="eip155:8453"; tx_hash="${txHash}"; confirmations="${conf}"`
};
```

---

## 🚧 実装ギャップと移行プラン

### Phase 1: 基盤強化（優先度: 🔴 Critical）

#### 1.1 ブロックチェーン検証実装
```bash
# 必要パッケージ
npm install ethers@^6.0.0
```

```typescript
// server/services/blockchain-verifier.ts
import { ethers } from 'ethers';

export class BlockchainVerifier {
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;
  
  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    this.usdcContract = new ethers.Contract(
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      ['event Transfer(address indexed from, address indexed to, uint256 value)'],
      this.provider
    );
  }
  
  async verifyUSDCTransfer(txHash: string, expectedTo: string, minAmount: string): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status !== 1) return false;
      
      // Transfer イベント検索
      const transferEvents = receipt.logs
        .filter(log => log.address.toLowerCase() === this.usdcContract.target.toLowerCase())
        .map(log => this.usdcContract.interface.parseLog(log))
        .filter(event => event?.name === 'Transfer');
      
      const validTransfer = transferEvents.find(event => 
        event.args.to.toLowerCase() === expectedTo.toLowerCase() &&
        event.args.value >= ethers.parseUnits(minAmount, 6)
      );
      
      return !!validTransfer;
    } catch (error) {
      console.error('Blockchain verification failed:', error);
      return false;
    }
  }
}
```

#### 1.2 nonce/order_id管理システム
```typescript
// server/services/order-manager.ts
export class OrderManager {
  private orders = new Map<string, {
    orderId: string;
    nonce: string;
    expiresAt: Date;
    used: boolean;
  }>();
  
  generateOrder(ttlMinutes = 5): { orderId: string; nonce: string } {
    const orderId = `ord_${crypto.randomBytes(16).toString('hex')}`;
    const nonce = `nx_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    
    this.orders.set(orderId, { orderId, nonce, expiresAt, used: false });
    return { orderId, nonce };
  }
  
  validateAndConsume(orderId: string, nonce: string): boolean {
    const order = this.orders.get(orderId);
    if (!order || order.used || order.nonce !== nonce || order.expiresAt < new Date()) {
      return false;
    }
    
    order.used = true;
    return true;
  }
}
```

### Phase 2: セキュリティ強化（優先度: 🟡 Medium）

#### 2.1 HMAC署名検証
```typescript
// server/services/signature-verifier.ts
import crypto from 'crypto';

export class SignatureVerifier {
  static sign(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
  
  static verify(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.sign(data, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }
}
```

### Phase 3: UX改善（優先度: 🟢 Low）

#### 3.1 確認数制御UI
```typescript
// client/src/components/confirmation-settings.tsx
export function ConfirmationSettings({ onSelect }: { onSelect: (conf: number) => void }) {
  const options = [
    { value: 0, label: "即時 (L2 Included)", time: "数秒", risk: "低額推奨" },
    { value: 2, label: "安全 (2 confirmations)", time: "~30秒", risk: "中額推奨" },
    { value: 3, label: "より安全 (3 confirmations)", time: "~1分", risk: "高額推奨" }
  ];
  
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <button 
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="w-full text-left p-3 border rounded-lg hover:bg-secondary"
        >
          <div className="font-medium">{opt.label}</div>
          <div className="text-sm text-muted-foreground">{opt.time} • {opt.risk}</div>
        </button>
      ))}
    </div>
  );
}
```

---

## 🔒 セキュリティ考慮事項

### 現在の脆弱性
1. **❌ トランザクション検証なし** - 偽のtxHashで攻撃可能
2. **❌ リプレイ攻撃** - 同じ支払い情報を再利用可能
3. **❌ 改ざん検知なし** - 支払い要件の書き換え可能
4. **❌ 金額検証不足** - サーバー側での金額確認なし

### 提供仕様での対策
1. **✅ フルオンチェーン検証** - 実際のUSDC転送を確認
2. **✅ nonce/order_id管理** - 一回限りの使用を保証
3. **✅ HMAC署名** - 要件改ざんを検知
4. **✅ サーバー側計算** - クライアント信頼なし

---

## 📊 パフォーマンス比較

| 操作 | 現在のxCockpit | 本格仕様 | 改善点 |
|------|---------------|---------|--------|
| **初回リクエスト** | ~50ms | ~100ms | 署名生成オーバーヘッド |
| **支払い検証** | ~10ms | ~500ms | RPC呼び出し追加 |
| **confirmations=0** | N/A | ~500ms | 即時可用 |
| **confirmations=2** | N/A | ~30秒 | ネットワーク待機 |

---

## 🎯 移行推奨ロードマップ

### Week 1-2: 基盤実装
- [ ] ethers.js統合
- [ ] BlockchainVerifier実装
- [ ] 基本的なオンチェーン検証

### Week 3: セキュリティ実装  
- [ ] OrderManager実装
- [ ] HMAC署名検証
- [ ] エラーハンドリング強化

### Week 4: 本格運用準備
- [ ] Base Mainnet対応
- [ ] 料金体系見直し
- [ ] モニタリング実装

### Week 5: 品質保証
- [ ] テストケース作成
- [ ] 負荷テスト
- [ ] セキュリティ監査

---

## 💡 実装のベストプラクティス

### 1. 段階的移行
```typescript
// 環境変数で段階的に機能を有効化
const USE_ENHANCED_VERIFICATION = process.env.ENHANCED_X402 === 'true';
const USE_MAINNET = process.env.NETWORK === 'mainnet';
```

### 2. フォールバック機能
```typescript
// 検証失敗時のグレースフルデグレード
if (enhancedVerificationFailed) {
  console.warn('Enhanced verification failed, falling back to basic check');
  return basicVerification(payment);
}
```

### 3. 設定可能な確認数
```typescript
// デバイス・金額に応じた動的設定
const minConfirmations = amount > 100 ? 3 : amount > 10 ? 2 : 0;
```

この比較解析により、現在のxCockpitから本格的なBase USDC仕様への移行計画が明確になりました。最も重要なのはブロックチェーン検証とセキュリティ機能の実装です。